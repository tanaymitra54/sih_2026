import { Router } from "express";
import { auth, type AuthedRequest } from "../middleware/auth.js";
import { createReport, listAlerts, listReports, heatmap } from "../services/reports.js";
import { heatmapV2 } from "../services/heatmapV2.js";

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

r.get("/heatmap-v2", async (req, res, next) => {
  try {
    const { timeRange, types, severity, bounds, zoom, includeScans } = req.query;
    res.json(await heatmapV2({
      timeRange: timeRange as string,
      types: types ? (types as string).split(",") : undefined,
      severity: severity ? (severity as string).split(",") : undefined,
      bounds: bounds ? JSON.parse(bounds as string) : undefined,
      zoom: zoom ? parseInt(zoom as string) : undefined,
      includeScans: includeScans === "true",
    }));
  } catch (e) { next(e); }
});

export default r;
