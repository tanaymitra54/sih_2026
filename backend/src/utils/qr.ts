import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as cryptoSign,
  timingSafeEqual,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { QR_HMAC_SECRET } from "../config.js";

/**
 * Pack signatures.
 *
 * New mints are signed with an Ed25519 private key held by the manufacturer;
 * anyone can verify them against the public key (GET /api/verify/public-key).
 * Packs minted before this upgrade carry a legacy HMAC-SHA256 signature and
 * still verify via verifySignature()'s fallback — no migration needed.
 */

const KEY_FILE = fileURLToPath(new URL("../../keys/mfr-ed25519.json", import.meta.url));

let privateKey: KeyObject | null = null;

function loadSigningKey(): KeyObject {
  if (privateKey) return privateKey;

  // 1) explicit env override (PEM pkcs8)
  if (process.env.QR_PRIVATE_KEY) {
    privateKey = createPrivateKey(process.env.QR_PRIVATE_KEY);
    return privateKey;
  }

  // 2) persisted demo keypair — survives restarts so existing packs keep verifying
  if (existsSync(KEY_FILE)) {
    const { privatePem } = JSON.parse(readFileSync(KEY_FILE, "utf8"));
    privateKey = createPrivateKey(privatePem);
    return privateKey;
  }

  // 3) first run: generate once, persist
  const { publicKey, privateKey: priv } = generateKeyPairSync("ed25519");
  const privatePem = priv.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  mkdirSync(dirname(KEY_FILE), { recursive: true });
  writeFileSync(KEY_FILE, JSON.stringify({ privatePem, publicPem }), { mode: 0o600 });
  privateKey = createPrivateKey(privatePem);
  return privateKey;
}

/** Public key PEM — publish this; third parties verify packs without holding any secret. */
export function getPublicKeyPem(): string {
  if (process.env.QR_PUBLIC_KEY) return process.env.QR_PUBLIC_KEY;
  if (existsSync(KEY_FILE)) {
    try {
      return JSON.parse(readFileSync(KEY_FILE, "utf8")).publicPem;
    } catch {
      /* fall through to derive */
    }
  }
  return createPublicKey(loadSigningKey()).export({ type: "spki", format: "pem" }).toString();
}

/** Serial like M-G-1A2B3C4D. */
export function generateSerial(): string {
  return `M-G-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const message = (serial: string, batchCode: string) => `${serial}|${batchCode}`;

/** Ed25519 signature over serial|batchCode, base64url — only the manufacturer's key can produce one. */
export function signSerial(serial: string, batchCode: string): string {
  const sig = cryptoSign(null, Buffer.from(message(serial, batchCode)), loadSigningKey());
  return sig.toString("base64url");
}

/** Pre-upgrade signature scheme (HMAC-SHA256 hex) — kept so older packs in the DB still verify. */
export function legacySignSerial(serial: string, batchCode: string): string {
  return createHmac("sha256", QR_HMAC_SECRET).update(message(serial, batchCode)).digest("hex");
}

export function verifySignature(serial: string, batchCode: string, sig: string): boolean {
  try {
    // Legacy packs: 64-char hex HMAC.
    if (/^[0-9a-f]{64}$/.test(sig)) {
      const expected = Buffer.from(legacySignSerial(serial, batchCode));
      const given = Buffer.from(sig);
      return expected.length === given.length && timingSafeEqual(expected, given);
    }
    // Current packs: Ed25519 over serial|batchCode.
    return cryptoVerify(
      null,
      Buffer.from(message(serial, batchCode)),
      createPublicKey(getPublicKeyPem()),
      Buffer.from(sig, "base64url"),
    );
  } catch {
    return false;
  }
}

export const QR_PREFIX = "MEDG:";

export function encodeQr(serial: string, hmac: string, batchCode: string): string {
  return `${QR_PREFIX}${serial}:${hmac}:${batchCode}`;
}

export interface ParsedQr {
  serial: string;
  hmac: string;
  batchCode: string;
}

export function parseQr(raw: string): ParsedQr | null {
  if (!raw) return null;
  // Accept a wrapped URL ("https://host/consumer/verify?qr=MEDG:...") so any
  // phone camera / Google Lens opens the verify page — then unwrap to the raw MEDG string.
  const wrapped = extractQrParam(raw);
  if (wrapped) raw = wrapped;
  if (!raw.startsWith(QR_PREFIX)) return null;
  const [serial, hmac, batchCode] = raw.slice(QR_PREFIX.length).split(":");
  if (!serial || !hmac || !batchCode) return null;
  return { serial, hmac, batchCode };
}

function extractQrParam(s: string): string | null {
  try {
    return new URL(s).searchParams.get("qr");
  } catch {
    return null;
  }
}
