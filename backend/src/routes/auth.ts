import { Router } from "express";
import { login, register } from "../services/auth.js";

const r = Router();

r.post("/register", async (req, res, next) => {
  try {
    res.json(await register(req.body));
  } catch (e) { next(e); }
});

r.post("/login", async (req, res, next) => {
  try {
    res.json(await login(req.body.email, req.body.password));
  } catch (e) { next(e); }
});

export default r;
