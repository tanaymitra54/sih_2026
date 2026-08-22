import assert from "node:assert";
import { generateSerial, legacySignSerial, signSerial, verifySignature } from "./qr.js";

// Round-trip: a minted signature verifies.
const serial = generateSerial();
const batch = "B-SELFTEST";
const sig = signSerial(serial, batch);
assert.ok(verifySignature(serial, batch, sig), "valid Ed25519 signature must verify");

// Tampering anywhere breaks it.
assert.ok(!verifySignature("M-G-DEADBEEF", batch, sig), "wrong serial must fail");
assert.ok(!verifySignature(serial, "B-OTHER", sig), "wrong batch must fail");
assert.ok(!verifySignature(serial, batch, sig.slice(0, -4) + "AAAA"), "tampered signature must fail");
assert.ok(!verifySignature(serial, batch, "not-a-signature"), "garbage signature must fail");

// Pre-upgrade HMAC packs still verify.
const legacy = legacySignSerial(serial, batch);
assert.match(legacy, /^[0-9a-f]{64}$/, "legacy signature is 64-char hex");
assert.ok(verifySignature(serial, batch, legacy), "legacy HMAC signature must still verify");

console.log("qr selfcheck ✓  (Ed25519 round-trip, tamper rejection, legacy HMAC fallback)");
