import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.js";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string };
}

export function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing_token" });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const msg = err.message;
  const known = new Set([
    "invalid_credentials", "invalid_role", "invalid_quantity", "invalid_qr", "not_found",
    "not_minted", "cannot_receive_from_state_", "cannot_sell_from_", "cannot_buy_from_", "receive_failed",
    "already_recalled", "chat_empty", "chat_timeout", "chat_api_error",
    "batch_not_approved", "batch_already_processed",
  ]);
  if (msg === "not_owner") {
    res.status(403).json({ error: msg });
    return;
  }
  if (known.has(msg) || msg.startsWith("cannot_receive_from_state_") || msg.startsWith("cannot_sell_from_") || msg.startsWith("cannot_buy_from_")) {
    res.status(400).json({ error: msg });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal_error" });
}
