import { Router } from "express";
import { auth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { createBatch, listBatches, getBatch } from "../services/batches.js";

const r = Router();

r.use(auth);

r.post("/", requireRole("manufacturer"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await createBatch(req.user!.id, req.body));
  } catch (e) { next(e); }
});

r.get("/", requireRole("manufacturer"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await listBatches(req.user!.id));
  } catch (e) { next(e); }
});

r.get("/:id", requireRole("manufacturer"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await getBatch(req.params.id));
  } catch (e) { next(e); }
});

export default r;
