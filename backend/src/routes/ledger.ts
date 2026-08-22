import { Router } from "express";
import { db } from "../config.js";
import { recentBlocks, productBlocks, productChainIsValid } from "../blockchain/ledger.js";
import { auth } from "../middleware/auth.js";

const r = Router();

// Public — powers the live ledger ticker on the dashboard.
r.get("/recent", async (_req, res, next) => {
  try {
    const limit = Math.min(Number(_req.query.limit) || 12, 30);
    res.json(await recentBlocks(limit));
  } catch (e) { next(e); }
});

/** Full custody trail for one pack — powers the manufacturer product detail view. */
r.get("/product/:serial", auth, async (req, res, next) => {
  try {
    const product = await db.product.findUnique({
      where: { serial: req.params.serial },
      include: { batch: true },
    });
    if (!product) return res.status(404).json({ error: "not_found" });

    const [blocks, users, chain] = await Promise.all([
      productBlocks(product.id),
      db.user.findMany(),
      productChainIsValid(product.id),
    ]);
    const whoById = new Map(users.map((u) => [u.id, `${u.name} · ${u.role}`]));

    res.json({
      product: {
        serial: product.serial,
        name: product.batch.name,
        batchCode: product.batch.code,
        route: product.batch.route,
        state: product.state,
        recalled: product.batch.recalled,
        mintedAt: blocks[0]?.timestamp ?? null,
      },
      chainValid: chain.valid,
      journey: blocks.map((b) => {
        let payload: Record<string, unknown> = {};
        try { payload = JSON.parse(b.payload); } catch { /* empty payload */ }
        return {
          action: b.action,
          who: whoById.get(b.signer) ?? b.signer,
          location: payload.location ? String(payload.location) : null,
          lat: typeof payload.lat === "number" ? payload.lat : null,
          lng: typeof payload.lng === "number" ? payload.lng : null,
          flags: Array.isArray(payload.flags) ? (payload.flags as string[]) : [],
          timestamp: b.timestamp,
        };
      }),
    });
  } catch (e) { next(e); }
});

export default r;
