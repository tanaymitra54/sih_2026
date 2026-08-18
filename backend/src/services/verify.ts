import { db } from "../config.js";
import { appendBlock, productBlocks, productChainIsValid } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { missingHandoffs } from "../blockchain/ledger-core.js";
import { verifySignature, parseQr } from "../utils/qr.js";

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
  const qr = parseQr(qrText);
  if (!qr) return { verdict: "COUNTERFEIT", flags: ["unparseable_qr"], product: null, journey: [] };

  const product = await db.product.findUnique({
    where: { serial: qr.serial },
    include: { batch: true },
  });

  if (!product) {
    await createAlert(null, "unminted_serial", `Serial ${qr.serial} was never minted.`);
    return { verdict: "COUNTERFEIT", flags: ["not_minted"], product: null, journey: [] };
  }

  const flags: string[] = [];

  if (!verifySignature(qr.serial, qr.batchCode, qr.hmac)) {
    flags.push("bad_signature");
    await createAlert(product.id, "bad_signature", `${product.serial}: signature does not verify — copied/forged QR.`);
  }

  const blocks = await productBlocks(product.id);
  const chain = blocks.length
    ? await productChainIsValid(product.id)
    : { valid: false };

  if (!chain.valid) flags.push("chain_broken");

  const missing = missingHandoffs(product.state, blocks.map((b) => b.action));
  if (missing.length) {
    flags.push("missing_handoff");
    await createAlert(product.id, "missing_handoff", `${product.serial}: chain missing ${missing.join(", ")} for state ${product.state}.`);
  }

  if (product.state === "SOLD") {
    flags.push("scanned_after_sold");
    await createAlert(product.id, "sold_then_scanned", `${product.serial} scanned after being sold — possible clone/reuse.`);
  }

  if (scan.location && !locationsMatch(product.batch.route, scan.location)) {
    flags.push("route_mismatch");
    await createAlert(product.id, "route_mismatch", `${product.serial} scanned at ${scan.location}, outside declared route ${product.batch.route}.`);
  }

  const scanCount = await db.scanEvent.count({ where: { productId: product.id } });
  if (scanCount >= 5) {
    flags.push("scan_flood");
    await createAlert(product.id, "scan_flood", `${product.serial} scanned ${scanCount + 1} times — many copies in circulation.`);
  }

  await db.scanEvent.create({
    data: { productId: product.id, location: scan.location ?? null, lat: scan.lat ?? null, lng: scan.lng ?? null },
  });
  await appendBlock({
    productId: product.id,
    action: ACTIONS.VERIFY,
    signer: "public",
    payload: JSON.stringify({ location: scan.location ?? "", flags }),
  });

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
    journey: blocks.map((b) => ({ action: b.action, signer: b.signer, payload: safeParse(b.payload), timestamp: b.timestamp })),
  };
}

async function createAlert(productId: string | null, type: string, message: string) {
  await db.alert.create({ data: { productId, type, message } });
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
