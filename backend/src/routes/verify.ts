import { Router } from "express";
import { verifyProduct } from "../services/verify.js";
import { buyProduct } from "../services/custody.js";

const r = Router();

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

export default r;
