import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { VerifyResult } from "../types";
import { CrossIcon, SendIcon, SparkleIcon } from "./icons";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function chatContext(result: VerifyResult | null) {
  if (!result) return undefined;
  return {
    verdict: result.verdict,
    flags: result.flags,
    product: result.product,
    journey: result.journey.map((j) => ({ action: j.action, signer: j.signer })),
  };
}

/** Floating AI assistant on the consumer verify page. Pack-aware via `result`. */
export function ChatBot({ result }: { result: VerifyResult | null }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const ctx = chatContext(result);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || typing) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError("");
    setTyping(true);
    try {
      const { data } = await api.post("/chat", {
        messages: next.slice(-20),
        lang,
        context: ctx,
      });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      const code = e.response?.data?.error;
      setError(code === "chat_api_error" || code === "chat_timeout"
        ? "AI service error — try again."
        : "Could not reach the assistant.");
    } finally {
      setTyping(false);
    }
  }

  const suggestions = result
    ? [t("chat.suggest.flags"), t("chat.suggest.safe"), t("chat.suggest.sideEffects"), t("chat.suggest.journey")]
    : [t("chat.suggest.general")];

  return (
    <>
      <button
        className="chat-fab"
        onClick={() => setOpen(!open)}
        aria-label={open ? t("chat.close") : t("chat.open")}
        title={open ? t("chat.close") : t("chat.open")}
      >
        {open ? <CrossIcon size={22} /> : <SparkleIcon size={24} />}
      </button>

      {open && (
        <div className="chat-panel animate-in" role="dialog" aria-label={t("chat.title")}>
          <div className="chat-head">
            <span className="chat-logo"><SparkleIcon size={16} /></span>
            <div>
              <div className="chat-title">{t("chat.title")}</div>
              <div className="chat-sub">{t("chat.subtitle")}</div>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t("chat.close")}>
              <CrossIcon size={18} />
            </button>
          </div>

          <div className="chat-body">
            {messages.length === 0 && <p className="muted chat-hint">{t("chat.hint")}</p>}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>
            ))}
            {typing && (
              <div className="chat-bubble assistant typing" aria-label={t("chat.title")}>
                <span /><span /><span />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chips chat-chips">
            {suggestions.map((s) => (
              <button key={s} className="chip chat-chip" onClick={() => send(s)} disabled={typing}>
                {s}
              </button>
            ))}
          </div>
          {error && <p className="error chat-error">{error}</p>}

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={t("chat.placeholder")}
              aria-label={t("chat.placeholder")}
            />
            <button className="btn small" onClick={() => send(input)} disabled={typing || !input.trim()}>
              <SendIcon /> {t("chat.send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
