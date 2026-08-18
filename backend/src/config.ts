import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

/** Read a required secret from the environment; refuse to boot on a weak/missing value. */
function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`Missing or weak ${name}. Run "npm run gen-env -w backend" to generate a local .env.`);
  }
  return value;
}

export const JWT_SECRET = requiredSecret("JWT_SECRET");
export const QR_HMAC_SECRET = requiredSecret("QR_HMAC_SECRET");
export const PORT = Number(process.env.PORT ?? 4000);
