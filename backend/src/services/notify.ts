import { db } from "../config.js";

interface BatchLike { code: string; name: string; route: string }

/**
 * Simulated SMS/WhatsApp recall alert. In production this would call a gateway
 * (Twilio/WhatsApp Business API); in the demo it logs the recipients.
 * ponytail: no real gateway — wire one here when going live.
 */
export async function notifyRecall(batch: BatchLike) {
  const stakeholders = await db.user.findMany({
    where: { role: { in: ["distributor", "pharmacist"] } },
    select: { name: true, role: true },
  });
  const sent = stakeholders.map((u) => ({
    to: u.name,
    channel: u.role === "pharmacist" ? "SMS + WhatsApp" : "WhatsApp",
    body: `MedGuard recall: batch ${batch.code} (${batch.name}) on route ${batch.route} is RECALLED. Check your stock and stop sales.`,
  }));
  if (sent.length) console.log("[notify] simulated recall alerts:", JSON.stringify(sent, null, 2));
  return sent;
}
