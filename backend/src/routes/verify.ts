import { Router } from "express";
import { verifyProduct } from "../services/verify.js";
import { verifyLimiter } from "../middleware/rateLimit.js";

const r = Router();

// Public — consumers and pharmacists scan with no account needed.
r.post("/", verifyLimiter, async (req, res, next) => {
  try {
    res.json(await verifyProduct(req.body.qr, req.body.scan ?? {}));
  } catch (e) { next(e); }
});

export default r;
