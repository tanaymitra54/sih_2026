import { Router } from "express";
import { auth, type AuthedRequest } from "../middleware/auth.js";
import { createReport, listAlerts, listReports, heatmap } from "../services/reports.js";

const r = Router();

r.post("/", auth, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await createReport({ productSerial: req.body.serial, reporterId: req.user!.id, reason: req.body.reason }));
  } catch (e) { next(e); }
});

r.get("/reports", auth, async (_req, res, next) => {
  try {
    res.json(await listReports());
  } catch (e) { next(e); }
});

r.get("/alerts", auth, async (_req, res, next) => {
  try {
    res.json(await listAlerts());
  } catch (e) { next(e); }
});

r.get("/heatmap", auth, async (_req, res, next) => {
  try {
    res.json(await heatmap());
  } catch (e) { next(e); }
});

export default r;
