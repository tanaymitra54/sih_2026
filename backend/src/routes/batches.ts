import { Router } from "express";
import { auth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { createBatch, listBatches, getBatch, recallBatch, approveBatch, rejectBatch, listPendingBatches, listAllBatches } from "../services/batches.js";

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

// Admin: mint requests awaiting approval
r.get("/pending", requireRole("admin"), async (_req, res, next) => {
  try {
    res.json(await listPendingBatches());
  } catch (e) { next(e); }
});

// Admin: every batch request + outcome
r.get("/all", requireRole("admin"), async (_req, res, next) => {
  try {
    res.json(await listAllBatches());
  } catch (e) { next(e); }
});

r.get("/:id", requireRole("manufacturer"), async (req: AuthedRequest, res, next) => {
  try {
    const batch = await getBatch(req.params.id);
    if (batch.manufacturerId !== req.user!.id) throw new Error("not_owner");
    res.json(batch);
  } catch (e) { next(e); }
});

// Admin: approve a mint request → batch becomes ACTIVE and QRs are minted
r.post("/:id/approve", requireRole("admin"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await approveBatch(req.user!.id, req.params.id));
  } catch (e) { next(e); }
});

// Admin: reject a mint request → terminal, nothing is ever minted
r.post("/:id/reject", requireRole("admin"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await rejectBatch(req.user!.id, req.params.id));
  } catch (e) { next(e); }
});

r.post("/:id/recall", requireRole("manufacturer"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await recallBatch(req.user!.id, req.params.id));
  } catch (e) { next(e); }
});

export default r;
