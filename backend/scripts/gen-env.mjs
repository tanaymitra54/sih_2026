import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(backendDir, ".env");

if (existsSync(envPath)) {
  console.log("gen-env: backend/.env already exists, skipping (secrets untouched).");
  process.exit(0);
}

const jwt = randomBytes(48).toString("hex");
const qr = randomBytes(48).toString("hex");

writeFileSync(
  envPath,
  [
    "# Backend",
    "PORT=4000",
    'DATABASE_URL="file:./dev.db"',
    `JWT_SECRET="${jwt}"`,
    `QR_HMAC_SECRET="${qr}"`,
    "",
    "# Frontend (Vite)",
    'VITE_API_BASE="/api"',
    "",
  ].join("\n"),
);

console.log("gen-env: created backend/.env with fresh random secrets.");
