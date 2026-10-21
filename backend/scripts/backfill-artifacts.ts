/**
 * Backfills the AWS plane for packs that already exist in SQLite.
 *
 * The live mint path is fire-and-forget (a mint must never wait on S3), so a
 * CLI seed process can exit before its uploads land. Run this after seeding:
 *   npm run aws:backfill -w backend
 */
import { db } from "../src/config.js";
import { encodeQr } from "../src/utils/qr.js";
import { uploadQrArtifact, signBatchManifest, snapshotLedger, awsEnabled } from "../src/aws/orvyn-aws.js";

if (!awsEnabled) {
  console.error("ORVYN_AWS_ENABLED is not 1 — refusing to backfill.");
  process.exit(1);
}

const batches = await db.batch.findMany({ include: { products: true, manufacturer: true } });
let qrCount = 0;

for (const batch of batches) {
  for (const p of batch.products) {
    await uploadQrArtifact({
      serial: p.serial,
      batchCode: batch.code,
      qr: encodeQr(p.serial, p.hmac, batch.code),
    });
    qrCount++;
  }
  if (batch.products.length) {
    const signed = await signBatchManifest({
      batchCode: batch.code,
      serials: batch.products.map((p) => p.serial),
    });
    console.log(
      `batch ${batch.code}: ${batch.products.length} QR(s)${signed ? `, manifest signed (${signed.digest.slice(0, 16)}…)` : ", manifest NOT signed"}`,
    );
  }
}

await snapshotLedger(true);
console.log(`backfill complete: ${qrCount} QR artifacts + ${batches.length} manifest(s) + ledger snapshot`);
await db.$disconnect();
