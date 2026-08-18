import { db } from "../config.js";

export async function createReport(data: { productSerial: string; reporterId?: string; reason: string }) {
  const product = await db.product.findUnique({ where: { serial: data.productSerial } });
  if (!product) throw new Error("not_found");
  return db.report.create({
    data: { productId: product.id, reporterId: data.reporterId ?? null, reason: data.reason },
  });
}

export async function listReports() {
  return db.report.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } });
}

export async function listAlerts() {
  return db.alert.findMany({ include: { product: true }, orderBy: { createdAt: "desc" } });
}
