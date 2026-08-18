import { db } from "../config.js";
import { appendBlock } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { encodeQr, generateSerial, signSerial } from "../utils/qr.js";
import { publicProduct } from "../utils/product.js";

/** Manufacturer mints a batch: creates N products, signs each QR, opens a chain block per product. */
export async function createBatch(manufacturerId: string, data: { name: string; quantity: number; route: string }) {
  if (data.quantity < 1 || data.quantity > 500) throw new Error("invalid_quantity");
  const code = `B-${Date.now().toString(36).toUpperCase()}`;
  const batch = await db.batch.create({
    data: { code, name: data.name, route: data.route, quantity: data.quantity, manufacturerId },
  });

  const products = [];
  for (let i = 0; i < data.quantity; i++) {
    const serial = generateSerial();
    const hmac = signSerial(serial, code);
    const product = await db.product.create({
      data: { serial, hmac, batchId: batch.id, state: "CREATED" },
    });
    await appendBlock({
      productId: product.id,
      action: ACTIONS.MINT,
      signer: manufacturerId,
      payload: JSON.stringify({ batchCode: code, by: "manufacturer" }),
    });
    products.push({ ...publicProduct(product), qr: encodeQr(serial, hmac, code) });
  }
  return { ...batch, products };
}

export async function listBatches(manufacturerId: string) {
  const batches = await db.batch.findMany({
    where: { manufacturerId },
    include: { products: true },
    orderBy: { createdAt: "desc" },
  });
  return batches.map((b) => ({
    ...b,
    products: b.products.map((p) => ({ ...publicProduct(p), qr: encodeQr(p.serial, p.hmac, b.code) })),
  }));
}

export async function getBatch(batchId: string, manufacturerId: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId }, include: { products: true } });
  if (!batch) throw new Error("not_found");
  if (batch.manufacturerId !== manufacturerId) throw new Error("not_found");
  return {
    ...batch,
    products: batch.products.map((p) => ({ ...publicProduct(p), qr: encodeQr(p.serial, p.hmac, batch.code) })),
  };
}
