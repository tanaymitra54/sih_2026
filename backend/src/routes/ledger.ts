import { Router } from "express";
import { recentBlocks } from "../blockchain/ledger.js";

const r = Router();

// Public — powers the live ledger ticker on the dashboard.
r.get("/recent", async (_req, res, next) => {
  try {
    const limit = Math.min(Number(_req.query.limit) || 12, 30);
    res.json(await recentBlocks(limit));
  } catch (e) { next(e); }
});

export default r;
