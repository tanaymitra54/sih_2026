import nodemailer from "nodemailer";
import { db } from "../config.js";
import { RECALL_MOCK_EMAIL, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from "../config.js";

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

  if (!SMTP_USER || !SMTP_PASS) {
    const preview = { to: RECALL_MOCK_EMAIL, channel: "email" as const, status: "preview" as const, subject, body, intendedRecipients };
    console.log("[notify] SMTP not configured; recall email preview:", JSON.stringify(preview, null, 2));
    return [preview];
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: `ORVYN alerts <${SMTP_USER}>`,
      to: RECALL_MOCK_EMAIL,
      subject,
      text: `${body}\n\nMock delivery recipient: ${RECALL_MOCK_EMAIL}\n\nIntended stakeholders:\n${intendedRecipients.join("\n") || "None"}`,
      html: emailHtml(batch, intendedRecipients),
    });
    return [{ to: RECALL_MOCK_EMAIL, channel: "email", status: "sent", subject, body, intendedRecipients }];
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery failed";
    console.error(`[notify] recall email failed for ${RECALL_MOCK_EMAIL}:`, message);
    return [{ to: RECALL_MOCK_EMAIL, channel: "email", status: "failed", subject, body, intendedRecipients, error: message }];
  }
}

function emailHtml(batch: BatchLike, intendedRecipients: string[]) {
  const e = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
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
