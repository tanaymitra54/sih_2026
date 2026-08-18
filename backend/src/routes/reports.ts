import { Router } from "express";
import { auth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { createReport, listAlerts, listReports } from "../services/reports.js";

const r = Router();

r.post("/", auth, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await createReport({ productSerial: req.body.serial, reporterId: req.user!.id, reason: req.body.reason }));
  } catch (e) { next(e); }
});

// Alert feed and reports are supply-chain facing — consumers can report, but
// only supply-chain roles may read the full intelligence feed.
r.get("/reports", auth, requireRole("manufacturer", "distributor", "pharmacist"), async (_req, res, next) => {
  try {
    res.json(await listReports());
  } catch (e) { next(e); }
});

r.get("/alerts", auth, requireRole("manufacturer", "distributor", "pharmacist"), async (_req, res, next) => {
  try {
    res.json(await listAlerts());
  } catch (e) { next(e); }
});

export default r;
