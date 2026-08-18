import { db } from "../config.js";
import { appendBlock, productBlocks } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { parseQr, verifySignature } from "../utils/qr.js";
import { publicProduct } from "../utils/product.js";

/**
 * Distributor or pharmacist receives custody of a product by scanning its QR.
 * Enforces the chain order: CREATED → (distributor) → DISTRIBUTED → (pharmacist) → AT_PHARMACY.
 * The HMAC signature is verified before any state change — a copied/forged sticker
 * cannot move a genuine pack through the chain.
 */
export async function receiveProduct(user: { id: string; role: string; location?: string | null }, qrText: string) {
  const qr = parseQr(qrText);
  if (!qr) throw new Error("invalid_qr");

  const product = await db.product.findUnique({ where: { serial: qr.serial }, include: { batch: true } });
  if (!product) throw new Error("not_minted");
  if (!verifySignature(qr.serial, product.batch.code, qr.hmac)) throw new Error("bad_signature");

  const roleCheck = user.role === "distributor" ? "CREATED" : user.role === "pharmacist" ? "DISTRIBUTED" : null;
  if (!roleCheck) throw new Error("forbidden");
  if (product.state !== roleCheck) throw new Error(`cannot_receive_from_state_${product.state}_as_${user.role}`);

  const nextState = user.role === "distributor" ? "DISTRIBUTED" : "AT_PHARMACY";

  const received = await db.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: { id: product.id, state: roleCheck },
      data: { state: nextState },
    });
    if (updated.count !== 1) throw new Error(`cannot_receive_from_state_${product.state}_as_${user.role}`);
    await appendBlock(
      {
        productId: product.id,
        action: ACTIONS.RECEIVE,
        signer: user.id,
        payload: JSON.stringify({ role: user.role, location: user.location ?? "" }),
      },
      tx,
    );
    return tx.product.findUnique({ where: { id: product.id } });
  });

  return publicProduct({ ...received!, state: nextState });
}

/**
 * Pharmacist dispenses a product that has reached AT_PHARMACY.
 * Requires a valid HMAC signature AND, if the pack was verified, that the last
 * verification was not flagged counterfeit — a genuine-only gate, server-side.
 */
export async function sellProduct(pharmacistId: string, serial: string) {
  const product = await db.product.findUnique({ where: { serial }, include: { batch: true } });
  if (!product) throw new Error("not_found");
  if (product.state !== "AT_PHARMACY") throw new Error(`cannot_sell_from_${product.state}`);
  if (!verifySignature(product.serial, product.batch.code, product.hmac)) throw new Error("bad_signature");

  const blocks = await productBlocks(product.id);
  const lastVerify = [...blocks].reverse().find((b) => b.action === ACTIONS.VERIFY);
  if (lastVerify) {
    const flags: string[] = (safeParse(lastVerify.payload)?.flags as string[] | undefined) ?? [];
    if (flags.includes("bad_signature") || flags.includes("chain_broken")) throw new Error("cannot_sell_not_genuine");
  }

  const sold = await db.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: { id: product.id, state: "AT_PHARMACY" },
      data: { state: "SOLD" },
    });
    if (updated.count !== 1) throw new Error(`cannot_sell_from_${product.state}`);
    await appendBlock(
      {
        productId: product.id,
        action: ACTIONS.SELL,
        signer: pharmacistId,
        payload: JSON.stringify({ by: "pharmacist" }),
      },
      tx,
    );
    return tx.product.findUnique({ where: { id: product.id } });
  });

  return publicProduct({ ...sold!, state: "SOLD" });
}

export async function productsByState(state?: string) {
  const products = await db.product.findMany({
    where: state ? { state } : {},
    include: { batch: true },
    orderBy: { createdAt: "desc" },
  });
  return products.map((p) => publicProduct(p));
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
