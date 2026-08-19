import { Router } from "express";
import { auth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { receiveProduct, sellProduct, productsByState, journeyForSerial } from "../services/custody.js";

const r = Router();

r.use(auth);

r.post("/receive", requireRole("distributor", "pharmacist"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await receiveProduct(req.user!, req.body.qr));
  } catch (e) { next(e); }
});

r.post("/sell", requireRole("pharmacist"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await sellProduct(req.user!.id, req.body.serial));
  } catch (e) { next(e); }
});

r.get("/products", auth, async (_req, res, next) => {
  try {
    const state = (_req.query.state as string) || undefined;
    res.json(await productsByState(state));
  } catch (e) { next(e); }
});

r.get("/journey/:serial", async (req: AuthedRequest, res, next) => {
  try {
    res.json(await journeyForSerial(req.params.serial));
  } catch (e) { next(e); }
});

export default r;
