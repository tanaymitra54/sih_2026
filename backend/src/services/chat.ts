import { DEEPSEEK_API_KEY } from "../config.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PackContext {
  verdict?: string;
  flags?: string[];
  product?: { name?: string; serial?: string; batchCode?: string; state?: string } | null;
  journey?: { action: string; signer?: string }[];
}

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", bn: "Bengali",
  mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  pa: "Punjabi", ur: "Urdu", or: "Odia", as: "Assamese", ne: "Nepali",
};

/**
 * Sends a chat request to DeepSeek (OpenAI-compatible API). The API key stays
 * server-side — the browser only ever talks to our /api/chat proxy.
 */
export async function chatDeepSeek(messages: ChatMessage[], lang?: string, context?: PackContext): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return "The AI assistant isn't configured on this demo server yet.";
  }

  const langName = lang ? LANG_NAMES[lang] ?? "English" : "English";
  const product = context?.product
    ? `${context.product.name ?? "Medicine"} (serial ${context.product.serial ?? "-"}, batch ${context.product.batchCode ?? "-"}, state ${context.product.state ?? "-"})`
    : "No pack has been scanned yet.";
  const verdict = context?.verdict ?? "unknown";
  const flags = context?.flags?.length ? context.flags.join(", ") : "none";
  const journey = context?.journey?.length
    ? context.journey.map((j) => j.action).join(" → ")
    : "empty";

  const system = [
    "You are MedGuard Assistant, the AI helper for India's anti-counterfeit medicine verification platform.",
    "Users scan a QR code on a medicine pack; MedGuard verifies it against an immutable, hash-chained custody ledger.",
    `Currently scanned pack — ${product}`,
    `Verification verdict: ${verdict}. Anomaly flags: ${flags}. Ledger journey: ${journey}.`,
    `Answer in ${langName}, matching the user's language.`,
    "Keep answers concise (under 120 words), simple, and practical. Use plain language, not medical jargon.",
    "Safety rule: never give a definitive medical diagnosis or drug recommendation. When appropriate, advise the user to consult a pharmacist or doctor.",
    "If asked about the scanned pack, explain the verdict and flags in easy terms and tell them what to do (e.g. do not consume a counterfeit/recalled pack, report it).",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let res: Response;
  try {
    res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 500,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error("chat_timeout");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error("chat_api_error");
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) throw new Error("chat_api_error");
  return reply;
}
