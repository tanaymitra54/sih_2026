import { Router } from "express";
import { verifyProduct } from "../services/verify.js";
import { buyProduct } from "../services/custody.js";
import { getPublicKeyPem } from "../utils/qr.js";
import { getStats, applyFeedback, resetTable } from "../services/riskEngine.js";
import { auth, requireRole } from "../middleware/auth.js";

const r = Router();

// Public — anyone can fetch the manufacturer's verification key; no secret is exposed.
r.get("/public-key", (_req, res) => {
  res.json({ algorithm: "Ed25519", publicKey: getPublicKeyPem() });
});

// Public — consumers and pharmacists scan with no account needed.
r.post("/", async (req, res, next) => {
  try {
    res.json(await verifyProduct(req.body.qr, req.body.scan ?? {}));
  } catch (e) { next(e); }
});

// Public — consumer buys a genuine pack at a pharmacy → SOLD.
r.post("/buy", async (req, res, next) => {
  try {
    res.json(await buyProduct(req.body.serial));
  } catch (e) { next(e); }
});

// RL — public stats (no secret), admin-only training controls
r.get("/rl-stats", (_req, res) => {
  res.json(getStats());
});

// Admin/any authed user can give feedback: reward +1 true fraud, -1 false alarm
r.post("/feedback", async (req, res, next) => {
  try {
    const { productId, serial, reward, correct } = req.body ?? {};
    // reward: number in [-1,1] OR boolean correct
    let rwd: number | null = null;
    if (typeof reward === "number") rwd = Math.max(-1, Math.min(1, reward));
    else if (typeof correct === "boolean") rwd = correct ? 1 : -1;
    else return res.status(400).json({ error: "provide reward (-1..1) or correct boolean" });

    // Resolve productId from serial if needed
    let pid: string | null = productId ?? null;
    if (!pid && serial) {
      const { db } = await import("../config.js");
      const p = await db.product.findUnique({ where: { serial }, select: { id: true } });
      pid = p?.id ?? null;
    }
    if (!pid) return res.status(400).json({ error: "productId or serial required" });
    const out = applyFeedback(pid, rwd);
    if (!out.ok) return res.status(404).json({ error: "no recent decision for this product — verify first" });
    res.json({ reward: rwd, ...out });
  } catch (e) { next(e); }
});

// Admin: reset Q-table (demo helper)
r.post("/rl-reset", auth, requireRole("admin"), (_req, res) => {
  resetTable();
  res.json({ ok: true, ...getStats() });
});

export default r;
