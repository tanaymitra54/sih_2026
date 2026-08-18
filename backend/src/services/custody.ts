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
  if (product.state !== "AT_PHARMACY") throw new Error(`cannot_sell_from_${product.state}`);

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
