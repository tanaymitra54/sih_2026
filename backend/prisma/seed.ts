import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/config.js";
import { encodeQr, generateSerial, signSerial } from "../src/utils/qr.js";
import { appendBlock } from "../src/blockchain/ledger.js";
import { ACTIONS } from "../src/blockchain/ledger.js";

async function main() {
  const password = await bcrypt.hash("demo1234", 10);

  const [mfr, dist, pharma, consumer] = await Promise.all([
    db.user.upsert({ where: { email: "mfr@medguard.in" }, update: {}, create: { name: "SunPharma Labs", email: "mfr@medguard.in", password, role: "manufacturer", location: "Mumbai" } }),
    db.user.upsert({ where: { email: "dist@medguard.in" }, update: {}, create: { name: "India Distributors", email: "dist@medguard.in", password, role: "distributor", location: "Pune" } }),
    db.user.upsert({ where: { email: "pharma@medguard.in" }, update: {}, create: { name: "CityCare Pharmacy", email: "pharma@medguard.in", password, role: "pharmacist", location: "Delhi" } }),
    db.user.upsert({ where: { email: "consumer@medguard.in" }, update: {}, create: { name: "Demo Consumer", email: "consumer@medguard.in", password, role: "consumer", location: "" } }),
  ]);

  const existing = await db.batch.count();
  if (existing > 0) {
    console.log("seed: DB already has data, skipping batch mint.");
    return;
  }

  const code = `B-DEMO-${Date.now().toString(36).toUpperCase()}`;
  const batch = await db.batch.create({
    data: { code, name: "Paracetamol 500mg", route: "Delhi", quantity: 5, manufacturerId: mfr.id },
  });

  for (let i = 0; i < 5; i++) {
    const serial = generateSerial();
    const hmac = signSerial(serial, code);
    const product = await db.product.create({
      data: { serial, hmac, batchId: batch.id, state: "CREATED" },
    });
    await appendBlock({
      productId: product.id,
      action: ACTIONS.MINT,
      signer: mfr.id,
      payload: JSON.stringify({ batchCode: code, by: "manufacturer" }),
    });
    console.log(`  minted ${serial} -> ${encodeQr(serial, hmac, code)}`);
  }

  console.log("seed: demo users (password demo1234) + 1 batch of 5 minted. Roles: mfr/dist/pharma/consumer.");
  console.log(`distributor@${dist.location} can receive, dispatch; pharmacist@${pharma.location} sells; consumer verifies.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
