import { db } from "../config.js";
import { resolveCoords } from "../utils/geo.js";
import { latLngToCell, cellToLatLng, cellToBoundary } from "h3-js";

interface HeatmapQuery {
  timeRange?: string;
  types?: string[];
  severity?: string[];
  bounds?: [[number, number], [number, number]];
  zoom?: number;
  includeScans?: boolean;
}

const RESOLUTION_BY_ZOOM: Record<number, number> = {
  0: 2, 1: 2, 2: 3, 3: 3, 4: 4, 5: 4, 6: 5, 7: 5, 8: 6, 9: 6, 10: 7,
};

function timeRangeToMs(range?: string): number | null {
  const map: Record<string, number> = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6, "90d": 7776e6 };
  return range ? map[range] ?? null : null;
}

export async function heatmapV2(query: HeatmapQuery) {
  const since = timeRangeToMs(query.timeRange) ? new Date(Date.now() - timeRangeToMs(query.timeRange)!) : null;
  const res = query.zoom ?? 6;
  const h3Res = RESOLUTION_BY_ZOOM[Math.min(res, 10)] ?? 5;

  const alertWhere: Record<string, unknown> = {};
  if (since) alertWhere.createdAt = { gte: since };
  if (query.types?.length) alertWhere.type = { in: query.types };
  if (query.severity?.length) alertWhere.severity = { in: query.severity };

  const alerts = await db.alert.findMany({
    where: alertWhere,
    include: { product: { include: { scans: { where: since ? { createdAt: { gte: since } } : {} } } } },
  });

  let scans: Array<{ lat: number | null; lng: number | null }> = [];
  if (query.includeScans) {
    const scanWhere: Record<string, unknown> = {};
    if (since) scanWhere.createdAt = { gte: since };
    if (query.bounds) {
      scanWhere.lat = { gte: query.bounds[0][0], lte: query.bounds[1][0] };
      scanWhere.lng = { gte: query.bounds[0][1], lte: query.bounds[1][1] };
    }
    scans = await db.scanEvent.findMany({ where: scanWhere, take: 5000, select: { lat: true, lng: true } });
  }

  const cellMap = new Map<string, { weight: number; alertCount: number; scanCount: number; types: Set<string>; maxSeverity: number }>();
  const severityWeight = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

  for (const a of alerts) {
    const scan = a.product?.scans?.[0];
    let lat = scan?.lat ?? null;
    let lng = scan?.lng ?? null;

    if (lat == null || lng == null) {
      const coords = a.location ? resolveCoords(a.location) : null;
      lat = coords?.lat ?? null;
      lng = coords?.lng ?? null;
    }
    if (lat == null || lng == null) continue;

    const cell = latLngToCell(lat, lng, h3Res);
    const existing = cellMap.get(cell) ?? { weight: 0, alertCount: 0, scanCount: 0, types: new Set<string>(), maxSeverity: 0 };
    existing.weight += (severityWeight[a.severity as keyof typeof severityWeight] ?? 2) * 3;
    existing.alertCount += 1;
    existing.types.add(a.type);
    existing.maxSeverity = Math.max(existing.maxSeverity, severityWeight[a.severity as keyof typeof severityWeight] ?? 2);
    cellMap.set(cell, existing);
  }

  for (const s of scans) {
    if (s.lat == null || s.lng == null) continue;
    const cell = latLngToCell(s.lat, s.lng, h3Res);
    const existing = cellMap.get(cell) ?? { weight: 0, alertCount: 0, scanCount: 0, types: new Set<string>(), maxSeverity: 0 };
    existing.weight += 1;
    existing.scanCount += 1;
    cellMap.set(cell, existing);
  }

  const points = [...cellMap.entries()].map(([cell, data]) => {
    const [lat, lng] = cellToLatLng(cell);
    const boundary = cellToBoundary(cell, true).map(([lat, lng]) => [lat, lng] as [number, number]);
    return {
      lat,
      lng,
      h3Cell: cell,
      boundary,
      weight: data.weight,
      alertCount: data.alertCount,
      scanCount: data.scanCount,
      topTypes: [...data.types].slice(0, 3),
      riskScore: Math.min(1, (data.alertCount * 0.3 + data.scanCount * 0.01) * (data.maxSeverity / 4)),
    };
  }).sort((a, b) => b.weight - a.weight);

  return { points, h3Res, generatedAt: new Date().toISOString() };
}