import { Router } from "express";
import { verifyProduct } from "../services/verify.js";

const r = Router();

// Public — consumers and pharmacists scan with no account needed.
r.post("/", async (req, res, next) => {
  try {
    res.json(await verifyProduct(req.body.qr, req.body.scan ?? {}));
  } catch (e) { next(e); }
});

export default r;
