import { db } from "../config.js";
import { appendBlock } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { parseQr } from "../utils/qr.js";

/**
 * Distributor or pharmacist receives custody of a product by scanning its QR.
 * Enforces the chain order: CREATED → (distributor) → DISTRIBUTED → (pharmacist) → AT_PHARMACY.
 */
export async function receiveProduct(user: { id: string; role: string }, qrText: string) {
  const qr = parseQr(qrText);
  if (!qr) throw new Error("invalid_qr");

  const product = await db.product.findUnique({ where: { serial: qr.serial }, include: { batch: true } });
  if (!product) throw new Error("not_minted");

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
  await appendBlock({
    productId: product.id,
    action: ACTIONS.RECEIVE,
    signer: user.id,
    payload: JSON.stringify({ role: user.role, location: user.location ?? "" }),
  });

  return { ...product, state: nextState };
}

/** Pharmacist dispenses a product that has reached AT_PHARMACY. */
export async function sellProduct(pharmacistId: string, serial: string) {
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
  await appendBlock({
    productId: product.id,
    action: ACTIONS.SELL,
    signer: pharmacistId,
    payload: JSON.stringify({ by: "pharmacist" }),
  });
  return { ...product, state: "SOLD" };
}

export async function productsByState(state?: string) {
  return db.product.findMany({
    where: state ? { state } : {},
    include: { batch: true },
    orderBy: { createdAt: "desc" },
  });
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
