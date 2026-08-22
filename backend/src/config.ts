import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();

export const JWT_SECRET = process.env.JWT_SECRET ?? "medguard-sih-2026-demo-secret";
export const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET ?? "medguard-qr-hmac-demo-secret";
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
export const PORT = Number(process.env.PORT ?? 4000);
export const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
export const SMTP_USER = process.env.SMTP_USER ?? "";
export const SMTP_PASS = process.env.SMTP_PASS ?? "";
export const RECALL_MOCK_EMAIL = process.env.RECALL_MOCK_EMAIL ?? "tanay.mitra2024@vitstudent.ac.in";
