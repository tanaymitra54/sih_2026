import { db } from "../config.js";
import { appendBlock, productBlocks, productChainIsValid } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { missingHandoffs } from "../blockchain/ledger-core.js";
import { verifySignature, parseQr } from "../utils/qr.js";
import { nearestCity } from "../utils/geo.js";
import { notifyAlert } from "./notify.js";

export interface VerifyResult {
  verdict: "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT";
  flags: string[];
  product: { serial: string; name: string; batchCode: string; state: string } | null;
  journey: { action: string; signer: string; payload: Record<string, unknown>; timestamp: number }[];
}

function locationsMatch(route: string, scanLoc?: string | null): boolean {
  if (!scanLoc) return true;
  const a = route.toLowerCase().replace(/\s+/g, "");
  const b = scanLoc.toLowerCase().replace(/\s+/g, "");
  return a.includes(b) || b.includes(a);
}

/**
 * Verifies a scanned QR. Public — consumers and pharmacists both hit this.
 * Rule order: never minted → bad signature → broken chain → sold-then-scanned → geo mismatch → scan flood.
 */
export async function verifyProduct(
  qrText: string,
  scan: { location?: string; lat?: number; lng?: number },
): Promise<VerifyResult> {
  // Consumer scans carry GPS coords; pharmacist scans may carry a text location.
  // Resolve coords → nearest metro so every alert feeds the heatmap.
  const alertLoc =
    scan.location ??
    (scan.lat != null && scan.lng != null ? nearestCity({ lat: scan.lat, lng: scan.lng }) : null);

  const qr = parseQr(qrText);
  if (!qr) {
    await createAlert(null, "unparseable_qr", `Unparseable QR scanned: "${qrText.slice(0, 80)}"`, alertLoc);
    return { verdict: "COUNTERFEIT", flags: ["unparseable_qr"], product: null, journey: [] };
  }

  const product = await db.product.findUnique({
    where: { serial: qr.serial },
    include: { batch: true },
  });

  if (!product) {
    await createAlert(null, "unminted_serial", `Serial ${qr.serial} was never minted.`, alertLoc);
    return { verdict: "COUNTERFEIT", flags: ["not_minted"], product: null, journey: [] };
  }

  const flags: string[] = [];

  if (!verifySignature(qr.serial, qr.batchCode, qr.hmac)) {
    flags.push("bad_signature");
    await createAlert(product.id, "bad_signature", `${product.serial}: signature does not verify — copied/forged QR.`, alertLoc);
  }

  if (product.batch.recalled) {
    flags.push("batch_recalled");
    await createAlert(product.id, "batch_recalled", `${product.serial} belongs to recalled batch ${product.batch.code}.`, alertLoc);
  }

  // Defense in depth: packs should only exist for admin-approved batches.
  if (product.batch.status !== "ACTIVE") {
    flags.push("batch_not_approved");
    await createAlert(product.id, "batch_not_approved", `${product.serial}: batch ${product.batch.code} is ${product.batch.status}, never approved by an admin.`, alertLoc);
  }

  const blocks = await productBlocks(product.id);
  const chain = blocks.length
    ? await productChainIsValid(product.id)
    : { valid: false };

  if (!chain.valid) flags.push("chain_broken");

  const missing = missingHandoffs(product.state, blocks.map((b) => b.action));
  if (missing.length) {
    flags.push("missing_handoff");
    await createAlert(product.id, "missing_handoff", `${product.serial}: chain missing ${missing.join(", ")} for state ${product.state}.`, alertLoc);
  }

  if (product.state === "SOLD") {
    flags.push("scanned_after_sold");
    await createAlert(product.id, "sold_then_scanned", `${product.serial} scanned after being sold — possible clone/reuse.`, alertLoc);
  }

  if (scan.location && !locationsMatch(product.batch.route, scan.location)) {
    flags.push("route_mismatch");
    await createAlert(product.id, "route_mismatch", `${product.serial} scanned at ${scan.location}, outside declared route ${product.batch.route}.`, alertLoc);
  }

  const scanCount = await db.scanEvent.count({ where: { productId: product.id } });
  if (scanCount >= 5) {
    flags.push("scan_flood");
    await createAlert(product.id, "scan_flood", `${product.serial} scanned ${scanCount + 1} times — many copies in circulation.`, alertLoc);
  }

  await db.scanEvent.create({
    data: { productId: product.id, location: scan.location ?? null, lat: scan.lat ?? null, lng: scan.lng ?? null },
  });
  const scanCoords = scan.lat != null && scan.lng != null ? { lat: scan.lat, lng: scan.lng } : {};
  const verifyBlock = await appendBlock({
    productId: product.id,
    action: ACTIONS.VERIFY,
    signer: "public",
    payload: JSON.stringify({ location: alertLoc ?? "", ...scanCoords, flags }),
  });

  const journeyBlocks = blocks.concat(verifyBlock);

  const verdict = flags.includes("bad_signature") || flags.includes("chain_broken")
    ? "COUNTERFEIT"
    : flags.length > 0
      ? "SUSPICIOUS"
      : "GENUINE";

  return {
    verdict,
    flags,
    product: {
      serial: product.serial,
      name: product.batch.name,
      batchCode: product.batch.code,
      state: product.state,
    },
    journey: journeyBlocks.map((b) => ({ action: b.action, signer: b.signer, payload: safeParse(b.payload), timestamp: b.timestamp })),
  };
}
async function createAlert(productId: string | null, type: string, message: string, location?: string | null) {
  const alert = await db.alert.create({ data: { productId, type, message, location: location ?? null } });
  // Fire-and-forget: SMTP must never slow down or fail a verification response.
  void notifyAlert(alert).catch((err) => console.error("[verify] alert email error:", err));
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
