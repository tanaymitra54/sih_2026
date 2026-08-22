import { db } from "../config.js";
import { appendBlock, productBlocks } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { parseQr, encodeQr } from "../utils/qr.js";
import { resolveCoords, nearestCity } from "../utils/geo.js";

/**
 * Distributor or pharmacist receives custody of a product by scanning its QR.
 * Enforces the chain order: CREATED → (distributor) → DISTRIBUTED → (pharmacist) → AT_PHARMACY.
 */
export async function receiveProduct(user: { id: string; role: string }, qrText: string, scan?: { lat?: number; lng?: number }) {
  const qr = parseQr(qrText);
  if (!qr) throw new Error("invalid_qr");

  const product = await db.product.findUnique({ where: { serial: qr.serial }, include: { batch: true } });
  if (!product) throw new Error("not_minted");
  // Defense in depth: packs of unapproved/rejected batches must never enter custody.
  if (product.batch.status !== "ACTIVE") throw new Error("batch_not_approved");

  let nextState: string;
  if (user.role === "distributor" && product.state === "CREATED") {
    nextState = "DISTRIBUTED";
  } else if (user.role === "pharmacist" && product.state === "DISTRIBUTED") {
    nextState = "AT_PHARMACY";
  } else {
    // Idempotent retry: a network drop can lose the response after a successful
    // receive, so the same user scanning the pack again is a success, not an error.
    const target = user.role === "distributor" ? "DISTRIBUTED"
                 : user.role === "pharmacist" ? "AT_PHARMACY" : null;
    if (target && product.state === target) {
      const last = await db.custodyRecord.findFirst({
        where: { productId: product.id, action: ACTIONS.RECEIVE },
        orderBy: { index: "desc" },
      });
      if (last?.signer === user.id) return { ...product, state: product.state };
    }
    throw new Error(`cannot_receive_from_state_${product.state}_as_${user.role}`);
  }

  await db.product.update({ where: { id: product.id }, data: { state: nextState } });
  const actor = await db.user.findUnique({ where: { id: user.id } });
  
  // Prefer GPS from scan, fallback to user profile location
  let coords: { lat: number; lng: number } | null = null;
  let locationName = actor?.location ?? "";
  if (scan?.lat != null && scan?.lng != null) {
    coords = { lat: scan.lat, lng: scan.lng };
    locationName = nearestCity({ lat: scan.lat, lng: scan.lng }) ?? actor?.location ?? "";
  } else {
    coords = resolveCoords(actor?.location);
  }
  
  await appendBlock({
    productId: product.id,
    action: ACTIONS.RECEIVE,
    signer: user.id,
    payload: JSON.stringify({ role: user.role, location: locationName, ...(coords ?? {}) }),
  });

  return { ...product, state: nextState };
}

/** Pharmacist dispenses a product that has reached AT_PHARMACY. */
export async function sellProduct(pharmacistId: string, serial: string, scan?: { lat?: number; lng?: number }) {
  const product = await db.product.findUnique({ where: { serial } });
  if (!product) throw new Error("not_found");
  if (product.state !== "AT_PHARMACY") {
    // Idempotent retry: the sale already went through but the response was lost.
    if (product.state === "SOLD") {
      const last = await db.custodyRecord.findFirst({
        where: { productId: product.id, action: ACTIONS.SELL },
        orderBy: { index: "desc" },
      });
      if (last?.signer === pharmacistId) return { ...product, state: "SOLD" };
    }
    throw new Error(`cannot_sell_from_${product.state}`);
  }

  await db.product.update({ where: { id: product.id }, data: { state: "SOLD" } });
  const pharma = await db.user.findUnique({ where: { id: pharmacistId } });
  
  // Prefer GPS from scan, fallback to user profile location
  let coords: { lat: number; lng: number } | null = null;
  let locationName = pharma?.location ?? "";
  if (scan?.lat != null && scan?.lng != null) {
    coords = { lat: scan.lat, lng: scan.lng };
    locationName = nearestCity({ lat: scan.lat, lng: scan.lng }) ?? pharma?.location ?? "";
  } else {
    coords = resolveCoords(pharma?.location);
  }
  
  await appendBlock({
    productId: product.id,
    action: ACTIONS.SELL,
    signer: pharmacistId,
    payload: JSON.stringify({ by: "pharmacist", location: locationName, ...(coords ?? {}) }),
  });
  return { ...product, state: "SOLD" };
}

export async function productsByState(state?: string) {
  const products = await db.product.findMany({
    where: state ? { state } : {},
    include: { batch: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map((p) => ({ ...p, qr: encodeQr(p.serial, p.hmac, p.batch.code) }));
}

/** Read-only journey for a pack — no VERIFY block is appended. */
export async function journeyForSerial(serial: string) {
  const product = await db.product.findUnique({ where: { serial }, include: { batch: true } });
  if (!product) throw new Error("not_found");
  const blocks = await productBlocks(product.id);
  return {
    product: { serial: product.serial, name: product.batch.name, batchCode: product.batch.code, state: product.state },
    journey: blocks.map((b) => ({ action: b.action, signer: b.signer, payload: safeParse(b.payload), timestamp: b.timestamp })),
  };
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/** Consumer buys a genuine pack at a pharmacy — closes the chain as SOLD. */
export async function buyProduct(serial: string) {
  const product = await db.product.findUnique({ where: { serial } });
  if (!product) throw new Error("not_found");
  if (product.state !== "AT_PHARMACY") {
    if (product.state === "SOLD") return { ...product, state: "SOLD" };
    throw new Error(`cannot_buy_from_${product.state}`);
  }

  await db.product.update({ where: { id: product.id }, data: { state: "SOLD" } });
  await appendBlock({
    productId: product.id,
    action: ACTIONS.BUY,
    signer: "consumer",
    payload: JSON.stringify({ by: "consumer" }),
  });
  return { ...product, state: "SOLD" };
}
