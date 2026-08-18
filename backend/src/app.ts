import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import batchRoutes from "./routes/batches.js";
import custodyRoutes from "./routes/custody.js";
import verifyRoutes from "./routes/verify.js";
import reportRoutes from "./routes/reports.js";
import { errorHandler } from "./middleware/auth.js";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/custody", custodyRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/reports", reportRoutes);

app.use("/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
