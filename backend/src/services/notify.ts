import nodemailer from "nodemailer";
import { db } from "../config.js";
import { ALERT_EMAIL, RECALL_MOCK_EMAIL, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from "../config.js";

interface BatchLike { code: string; name: string; route: string; quantity: number }

interface RecallNotification {
  to: string;
  channel: "email";
  status: "sent" | "preview" | "failed";
  subject: string;
  body: string;
  intendedRecipients: string[];
  error?: string;
}

export interface AlertLike {
  id: string;
  productId: string | null;
  type: string;
  message: string;
  location: string | null;
  createdAt: Date;
}

const CRITICAL_ALERT_TYPES = new Set(["unminted_serial", "bad_signature", "unparseable_qr", "batch_recalled"]);

const ALERT_THROTTLE_MS = 10 * 60 * 1000;
const recentAlertSends = new Map<string, number>();

let cachedTransporter: nodemailer.Transporter | null = null;

/** Shared SMTP transporter — created lazily once, reused by recall + alert emails. */
function getTransporter(): nodemailer.Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return cachedTransporter;
}

function smtpConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS);
}

/** Sends the mock recall email without making recall itself dependent on SMTP. */
export async function notifyRecall(batch: BatchLike): Promise<RecallNotification[]> {
  const stakeholders = await db.user.findMany({
    where: { role: { in: ["distributor", "pharmacist"] } },
    select: { name: true, email: true, role: true },
  });
  const intendedRecipients = stakeholders.map((u) => `${u.name} (${u.role}) — ${u.email}`);
  const subject = `ORVYN recall notice: ${batch.code} — ${batch.name}`;
  const body = [
    `ORVYN recall: batch ${batch.code} (${batch.name}) is RECALLED.`,
    `Route: ${batch.route}`,
    `Packs affected: ${batch.quantity}`,
    "Action required: stop selling, quarantine stock, and confirm your inventory.",
  ].join("\n");

  if (!smtpConfigured()) {
    const preview = { to: ALERT_EMAIL, channel: "email" as const, status: "preview" as const, subject, body, intendedRecipients };
    console.log("[notify] SMTP not configured; recall email preview:", JSON.stringify(preview, null, 2));
    return [preview];
  }

  try {
    await getTransporter().sendMail({
      from: `ORVYN alerts <${SMTP_USER}>`,
      to: ALERT_EMAIL,
      subject,
      text: `${body}\n\nMock delivery recipient: ${ALERT_EMAIL}\n\nIntended stakeholders:\n${intendedRecipients.join("\n") || "None"}`,
      html: emailHtml(batch, intendedRecipients),
    });
    return [{ to: ALERT_EMAIL, channel: "email", status: "sent", subject, body, intendedRecipients }];
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery failed";
    console.error(`[notify] recall email failed for ${ALERT_EMAIL}:`, message);
    return [{ to: ALERT_EMAIL, channel: "email", status: "failed", subject, body, intendedRecipients, error: message }];
  }
}

/**
 * Emails one alert to the admin inbox (ALERT_EMAIL). Never throws.
 * Throttled per productId+type so repeated scans of the same fake pack
 * don't flood the inbox (the DB alert row is still always saved).
 */
export async function notifyAlert(alert: AlertLike): Promise<void> {
  const key = `${alert.productId ?? "none"}:${alert.type}`;
  const lastSentAt = recentAlertSends.get(key);
  if (lastSentAt && Date.now() - lastSentAt < ALERT_THROTTLE_MS) return;

  const critical = CRITICAL_ALERT_TYPES.has(alert.type);
  const subject = `[ORVYN ALERT${critical ? " · CRITICAL" : ""}] ${alert.type}${alert.location ? ` @ ${alert.location}` : ""}`;
  const body = [
    `Type: ${alert.type}${critical ? " (CRITICAL)" : ""}`,
    `Message: ${alert.message}`,
    `Location: ${alert.location ?? "unknown"}`,
    `Time: ${alert.createdAt.toISOString()}`,
    `Product: ${alert.productId ?? "none (scan-level)"}`,
  ].join("\n");

  if (!smtpConfigured()) {
    console.log(`[notify] SMTP not configured; alert email preview for ${ALERT_EMAIL}:\nsubject: ${subject}\n${body}`);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `ORVYN alerts <${SMTP_USER}>`,
      to: ALERT_EMAIL,
      subject,
      text: body,
      html: alertEmailHtml(alert, critical),
    });
    recentAlertSends.set(key, Date.now());
    pruneThrottleMap();
  } catch (error) {
    console.error(`[notify] alert email failed for ${ALERT_EMAIL}:`, error instanceof Error ? error.message : error);
  }
}

function pruneThrottleMap() {
  if (recentAlertSends.size < 500) return;
  const cutoff = Date.now() - ALERT_THROTTLE_MS;
  for (const [key, sentAt] of recentAlertSends) {
    if (sentAt < cutoff) recentAlertSends.delete(key);
  }
}

function emailHtml(batch: BatchLike, intendedRecipients: string[]) {
  const e = escapeHtml;
  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;color:#172230">
      <div style="padding:22px 24px;background:#172230;color:#fff;font-size:22px;font-weight:700">ORVYN</div>
      <div style="padding:28px 24px;border:1px solid #dce3da">
        <p style="color:#d65d59;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Urgent recall notice</p>
        <h1 style="margin:0 0 18px">${e(batch.name)} · ${e(batch.code)}</h1>
        <p>This batch has been recalled. Stop selling or dispensing the affected packs immediately.</p>
        <table style="margin:22px 0;border-collapse:collapse;width:100%">
          <tr><td style="padding:9px 0;color:#63716c">Declared route</td><td style="padding:9px 0;font-weight:700">${e(batch.route)}</td></tr>
          <tr><td style="padding:9px 0;color:#63716c">Packs affected</td><td style="padding:9px 0;font-weight:700">${batch.quantity}</td></tr>
        </table>
        <p style="padding:14px;background:#fff3e4;border-radius:8px"><strong>Action:</strong> quarantine stock and confirm inventory with your supervisor.</p>
        <p style="color:#63716c;font-size:12px">Mock email. Intended stakeholders: ${e(intendedRecipients.join(", ") || "none")}</p>
      </div>
    </div>`;
}

function alertEmailHtml(alert: AlertLike, critical: boolean) {
  const accent = critical ? "#d65d59" : "#c07f2b";
  const rows = [
    ["Severity", critical ? "CRITICAL" : "Suspicious"],
    ["Message", alert.message],
    ["Location", alert.location ?? "unknown"],
    ["Time (UTC)", alert.createdAt.toISOString()],
    ["Product ID", alert.productId ?? "—"],
  ];
  return `
    <div style="font-family:Arial,sans-serif;max-width:620px;color:#172230">
      <div style="padding:22px 24px;background:#172230;color:#fff;font-size:22px;font-weight:700">ORVYN</div>
      <div style="padding:28px 24px;border:1px solid #dce3da">
        <p style="color:${accent};font-weight:700;letter-spacing:.08em;text-transform:uppercase">${critical ? "Critical alert" : "Suspicious activity"}</p>
        <h1 style="margin:0 0 18px;font-size:20px">${escapeHtml(alert.type)}</h1>
        <table style="margin:22px 0;border-collapse:collapse;width:100%">
          ${rows.map(([k, v]) => `<tr><td style="padding:9px 0;color:#63716c;vertical-align:top;width:130px">${escapeHtml(k)}</td><td style="padding:9px 0;font-weight:600">${escapeHtml(v)}</td></tr>`).join("")}
        </table>
        <p style="color:#63716c;font-size:12px">Automated ORVYN alert · delivered to ${escapeHtml(ALERT_EMAIL)} · mock delivery via ${escapeHtml(RECALL_MOCK_EMAIL)}</p>
      </div>
    </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
