import { createHmac, randomBytes } from "node:crypto";
import { QR_HMAC_SECRET } from "../config.js";

/** Serial like M-G-1A2B3C4D. */
export function generateSerial(): string {
  return `M-G-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** HMAC signature — only the holder of the secret can mint a valid QR. */
export function signSerial(serial: string, batchCode: string): string {
  return createHmac("sha256", QR_HMAC_SECRET).update(`${serial}|${batchCode}`).digest("hex");
}

export function verifySignature(serial: string, batchCode: string, hmac: string): boolean {
  try {
    return createHmac("sha256", QR_HMAC_SECRET).update(`${serial}|${batchCode}`).digest("hex") === hmac;
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
