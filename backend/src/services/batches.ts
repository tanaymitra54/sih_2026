import { db } from "../config.js";
import { appendBlock } from "../blockchain/ledger.js";
import { ACTIONS } from "../blockchain/ledger.js";
import { encodeQr, generateSerial, signSerial } from "../utils/qr.js";
import { notifyRecall } from "./notify.js";
import { resolveCoords } from "../utils/geo.js";

/**
 * Manufacturer submits a mint request. No products, serials, QRs or ledger
 * blocks exist yet — nothing cryptographic is created until an admin approves.
 */
export async function createBatch(manufacturerId: string, data: { name: string; quantity: number; route: string }) {
  if (data.quantity < 1 || data.quantity > 500) throw new Error("invalid_quantity");
  const code = `B-${Date.now().toString(36).toUpperCase()}`;
  const batch = await db.batch.create({
    data: { code, name: data.name, route: data.route, quantity: data.quantity, manufacturerId },
  });
  return { ...batch, products: [] };
}

/**
 * Admin approves a mint request → batch becomes ACTIVE and the actual mint runs:
 * per pack a serial is generated, Ed25519-signed, a Product row and MINT ledger
 * block are created. The admin's approval is embedded in each MINT payload so the
 * attribution is tamper-evident without doubling chain length.
 */
export async function approveBatch(adminId: string, batchId: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId }, include: { manufacturer: true } });
  if (!batch) throw new Error("not_found");

  // Race-safe flip: only one caller can move PENDING → ACTIVE.
  // A second click / concurrent admin flips zero rows and gets a clean error.
  const flip = await db.batch.updateMany({
    where: { id: batchId, status: "PENDING" },
    data: { status: "ACTIVE", approvedAt: new Date() },
  });
  if (flip.count === 0) throw new Error("batch_already_processed");

  const mfr = batch.manufacturer;
  const coords = resolveCoords(mfr?.location);
  let minted = 0;
  for (let i = 0; i < batch.quantity; i++) {
    const serial = generateSerial();
    const hmac = signSerial(serial, batch.code);
    const product = await db.product.create({
      data: { serial, hmac, batchId: batch.id, state: "CREATED" },
    });
    await appendBlock({
      productId: product.id,
      action: ACTIONS.MINT,
      signer: batch.manufacturerId,
      payload: JSON.stringify({
        batchCode: batch.code,
        by: "manufacturer",
        approvedBy: adminId,
        location: mfr?.location ?? "",
        ...(coords ?? {}),
      }),
    });
    minted++;
  }
  return { ...batch, status: "ACTIVE", productsMinted: minted };
}

/** Admin rejects a mint request. Terminal — no products are ever created. */
export async function rejectBatch(adminId: string, batchId: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("not_found");
  const flip = await db.batch.updateMany({
    where: { id: batchId, status: "PENDING" },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });
  if (flip.count === 0) throw new Error("batch_already_processed");
  return { ...batch, status: "REJECTED", reviewedBy: adminId };
}

/** Admin view of all awaiting mint requests. */
export async function listPendingBatches() {
  return db.batch.findMany({
    where: { status: "PENDING" },
    include: { manufacturer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Admin view of every batch request and its outcome (recent first). */
export async function listAllBatches() {
  return db.batch.findMany({
    include: { manufacturer: { select: { name: true } }, _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listBatches(manufacturerId: string) {
  const batches = await db.batch.findMany({
    where: { manufacturerId },
    include: { products: true },
    orderBy: { createdAt: "desc" },
  });
  return batches.map((b) => ({
    ...b,
    products: b.products.map((p) => ({ ...p, qr: encodeQr(p.serial, p.hmac, b.code) })),
  }));
}

export async function getBatch(batchId: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId }, include: { products: true } });
  if (!batch) throw new Error("not_found");
  return {
    ...batch,
    products: batch.products.map((p) => ({ ...p, qr: encodeQr(p.serial, p.hmac, batch.code) })),
  };
}

/**
 * Manufacturer recalls a batch: every pack in it is flagged, a RECALL ledger block is
 * appended per product, and stakeholders are alerted (SMS/WhatsApp simulated in demo).
 */
export async function recallBatch(manufacturerId: string, batchId: string) {
  const batch = await db.batch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error("not_found");
  if (batch.manufacturerId !== manufacturerId) throw new Error("not_owner");
  if (batch.status !== "ACTIVE") throw new Error("batch_not_approved");
  if (batch.recalled) throw new Error("already_recalled");

  const products = await db.product.findMany({ where: { batchId } });
  for (const p of products) {
    await appendBlock({
      productId: p.id,
      action: ACTIONS.RECALL,
      signer: manufacturerId,
      payload: JSON.stringify({ batchCode: batch.code, by: "manufacturer" }),
    });
  }
  await db.batch.update({ where: { id: batchId }, data: { recalled: true, recalledAt: new Date() } });
  await db.alert.create({
    data: {
      type: "batch_recalled",
      message: `Batch ${batch.code} (${batch.name}) recalled — ${products.length} packs flagged. Do not sell.`,
      location: batch.route,
    },
  });

  const sent = await notifyRecall(batch);
  return { ...batch, recalled: true, notified: sent };
}
