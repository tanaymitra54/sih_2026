import { Router } from "express";
import { chatDeepSeek, type ChatMessage } from "../services/chat.js";

const r = Router();

// Public — anonymous consumers chat with the AI assistant.
r.post("/", async (req, res, next) => {
  try {
    const { messages, lang, context } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "chat_empty" });
      return;
    }
    const clean: ChatMessage[] = messages
      .slice(-20)
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: String(m.content) }))
      .filter((m) => m.content.length > 0 && m.content.length <= 2000);
    if (clean.length === 0) {
      res.status(400).json({ error: "chat_empty" });
      return;
    }
    const reply = await chatDeepSeek(clean, lang, context);
    res.json({ reply });
  } catch (e) { next(e); }
});

export default r;
