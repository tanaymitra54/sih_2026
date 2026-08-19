import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

export const JWT_SECRET = process.env.JWT_SECRET ?? "medguard-sih-2026-demo-secret";
export const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET ?? "medguard-qr-hmac-demo-secret";
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
export const PORT = Number(process.env.PORT ?? 4000);
