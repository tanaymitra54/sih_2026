import { db } from "../config.js";
import { resolveCoords } from "../utils/geo.js";

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

/** Counterfeit/anomaly hotspots: alert count grouped by scan location, with coords for the map. */
export async function heatmap() {
  const alerts = await db.alert.findMany({
    where: { location: { not: null }, type: { not: "batch_recalled" } },
    select: { location: true },
  });
  const counts = new Map<string, number>();
  for (const a of alerts) {
    const loc = (a.location ?? "").trim();
    if (!loc) continue;
    counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([location, count]) => {
      const c = resolveCoords(location);
      return { location, count, lat: c?.lat ?? null, lng: c?.lng ?? null };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);
}
