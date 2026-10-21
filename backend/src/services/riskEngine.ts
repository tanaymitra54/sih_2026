import fs from "node:fs";
import path from "node:path";
import { db } from "../config.js";

// ── RL config ──────────────────────────────────────────────────────────────
const STATES = 3; // low / medium / high raw risk
const ACTIONS = 3; // 0:sensitive 1:balanced 2:strict
export const THRESHOLDS = [0.3, 0.5, 0.7] as const;
const ALPHA = 0.2;
const EPSILON_START = 0.3;
const EPSILON_DECAY = 0.995;
const EPSILON_MIN = 0.05;

// ── Persistence (JSON file, no DB migration) ──────────────────────────────
const DATA_DIR = path.join(process.cwd(), "prisma");
const TABLE_PATH = path.join(DATA_DIR, "rl-table.json");

let epsilon = EPSILON_START;
let qTable: number[][] = Array.from({ length: STATES }, () => Array(ACTIONS).fill(0));
let totalUpdates = 0;

function loadTable() {
  try {
    const raw = fs.readFileSync(TABLE_PATH, "utf-8");
    const j = JSON.parse(raw);
    if (Array.isArray(j.qTable) && j.qTable.length === STATES) qTable = j.qTable;
    if (typeof j.epsilon === "number") epsilon = j.epsilon;
    if (typeof j.totalUpdates === "number") totalUpdates = j.totalUpdates;
  } catch { /* first run */ }
}
function saveTable() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TABLE_PATH, JSON.stringify({ qTable, epsilon, totalUpdates }, null, 2));
  } catch (e) { console.error("[rl] save failed", e); }
}
loadTable();

// ── In-memory last decision for feedback ─────────────────────────────────
const lastDecision = new Map<string, { state: number; action: number }>();

// ── Geo ────────────────────────────────────────────────────────────────────
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

// ── Features ───────────────────────────────────────────────────────────────
export interface RiskFeatures {
  velocityKmH: number;
  scansInLastHour: number;
  scansTotal: number;
  uniqueLocations24h: number;
  postSale: number; // 0 or 1
  chainGap: number; // 0 or 1
}

export async function extractFeatures(
  productId: string,
  scan: { lat?: number; lng?: number },
  productState: string,
  missingCount: number,
): Promise<RiskFeatures> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 3600000);
  const oneDayAgo = new Date(now - 86400000);

  const [scansInLastHour, scansTotal, recentScans, lastGeoScan] = await Promise.all([
    db.scanEvent.count({ where: { productId, createdAt: { gte: oneHourAgo } } }),
    db.scanEvent.count({ where: { productId } }),
    db.scanEvent.findMany({ where: { productId, createdAt: { gte: oneDayAgo } }, select: { location: true } }),
    scan.lat != null && scan.lng != null
      ? db.scanEvent.findFirst({
          where: { productId, lat: { not: null }, lng: { not: null } },
          orderBy: { createdAt: "desc" },
          select: { lat: true, lng: true, createdAt: true },
        })
      : null,
  ]);

  let velocityKmH = 0;
  if (scan.lat != null && scan.lng != null && lastGeoScan?.lat != null && lastGeoScan?.lng != null) {
    const km = haversineKm(lastGeoScan.lat!, lastGeoScan.lng!, scan.lat, scan.lng);
    const hours = Math.max(0.02, (now - lastGeoScan.createdAt.getTime()) / 3600000); // floor 72s to avoid div/0
    velocityKmH = km / hours;
  }

  const uniqueLocations24h = new Set(recentScans.map((r) => r.location ?? "unknown")).size;

  return {
    velocityKmH,
    scansInLastHour,
    scansTotal,
    uniqueLocations24h,
    postSale: productState === "SOLD" ? 1 : 0,
    chainGap: missingCount > 0 ? 1 : 0,
  };
}

export function computeRawScore(f: RiskFeatures): number {
  const vNorm = Math.min(1, f.velocityKmH / 900);
  const floodNorm = Math.min(1, f.scansInLastHour / 6);
  const totalNorm = Math.min(1, f.scansTotal / 12);
  const locNorm = Math.min(1, Math.max(0, f.uniqueLocations24h - 1) / 3);
  return Math.min(
    1,
    Math.max(0, 0.35 * vNorm + 0.2 * floodNorm + 0.15 * totalNorm + 0.15 * locNorm + 0.1 * f.postSale + 0.05 * f.chainGap),
  );
}

function stateFromScore(score: number): number {
  if (score < 0.33) return 0;
  if (score < 0.66) return 1;
  return 2;
}

function selectAction(state: number): number {
  if (Math.random() < epsilon) return Math.floor(Math.random() * ACTIONS);
  const row = qTable[state];
  let best = 0;
  for (let a = 1; a < ACTIONS; a++) if (row[a] > row[best]) best = a;
  return best;
}

// ── Public API ─────────────────────────────────────────────────────────────
export interface RiskAssessment {
  features: RiskFeatures;
  rawScore: number; // 0..1
  riskScore: number; // 0..100
  state: number;
  action: number;
  threshold: number;
  mlFlags: string[];
  reasons: string[];
}

export async function assessRisk(
  productId: string,
  scan: { lat?: number; lng?: number },
  productState: string,
  missingCount: number,
): Promise<RiskAssessment> {
  const features = await extractFeatures(productId, scan, productState, missingCount);
  const rawScore = computeRawScore(features);
  const state = stateFromScore(rawScore);
  const action = selectAction(state);
  const threshold = THRESHOLDS[action];

  const mlFlags: string[] = [];
  const reasons: string[] = [];

  if (features.velocityKmH > 900) {
    mlFlags.push("impossible_travel");
    reasons.push(`impossible travel ${Math.round(features.velocityKmH)} km/h`);
  }
  if (rawScore > threshold) {
    mlFlags.push("ml_high_risk");
    reasons.push(`ml risk ${Math.round(rawScore * 100)}/100 exceeds threshold ${threshold} (policy ${["sensitive", "balanced", "strict"][action]})`);
  } else if (rawScore > 0.25 && mlFlags.length === 0) {
    // Borderline — surface as informational without flagging SUSPICIOUS alone
  }

  // Remember for feedback
  lastDecision.set(productId, { state, action });

  // Epsilon decay on every assessment (exploration → exploitation)
  epsilon = Math.max(EPSILON_MIN, epsilon * EPSILON_DECAY);

  return {
    features,
    rawScore,
    riskScore: Math.round(rawScore * 100),
    state,
    action,
    threshold,
    mlFlags,
    reasons,
  };
}

export function getQTable() {
  return { qTable: qTable.map((r) => [...r]), epsilon: Number(epsilon.toFixed(4)), totalUpdates, thresholds: [...THRESHOLDS] };
}

export function getStats() {
  return {
    qTable: qTable.map((r) => [...r]),
    epsilon: Number(epsilon.toFixed(4)),
    totalUpdates,
    thresholds: [...THRESHOLDS],
    states: ["low", "medium", "high"],
    actions: ["sensitive(0.3)", "balanced(0.5)", "strict(0.7)"],
  };
}

/** Reward: +1 true fraud caught, -1 false alarm. Called from feedback endpoint. */
export function applyFeedback(productId: string, reward: number): { ok: boolean; state?: number; action?: number; qOld?: number; qNew?: number } {
  const dec = lastDecision.get(productId);
  if (!dec) return { ok: false };
  const { state, action } = dec;
  const qOld = qTable[state][action];
  // Q-learning bandit update (no next-state, single-step)
  qTable[state][action] = qOld + ALPHA * (reward - qOld);
  totalUpdates++;
  epsilon = Math.max(EPSILON_MIN, epsilon * EPSILON_DECAY);
  saveTable();
  return { ok: true, state, action, qOld: Number(qOld.toFixed(4)), qNew: Number(qTable[state][action].toFixed(4)) };
}

/** Direct bandit update without needing a prior assessRisk — for simulation / training */
export function banditUpdate(state: number, action: number, reward: number) {
  const qOld = qTable[state][action];
  qTable[state][action] = qOld + ALPHA * (reward - qOld);
  totalUpdates++;
  saveTable();
  return { qOld, qNew: qTable[state][action] };
}

export function resetTable() {
  qTable = Array.from({ length: STATES }, () => Array(ACTIONS).fill(0));
  epsilon = EPSILON_START;
  totalUpdates = 0;
  lastDecision.clear();
  saveTable();
}
