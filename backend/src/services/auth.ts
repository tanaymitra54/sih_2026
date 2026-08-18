import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, JWT_SECRET } from "../config.js";

export interface JwtPayload {
  id: string;
  role: string;
}

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Public self-registration is limited to `consumer` (lowest privilege). Supply-chain
 * roles (manufacturer/distributor/pharmacist) are created only server-side (seed/onboarding)
 * so nobody can mint themselves as a manufacturer and sign "genuine" QRs.
 */
export async function register(data: { name: string; email: string; password: string; role?: string; location?: string }) {
  const role = data.role ?? "consumer";
  if (role !== "consumer") throw new Error("invalid_role");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) throw new Error("invalid_email");
  if (!data.password || data.password.length < 8) throw new Error("weak_password");
  const password = await bcrypt.hash(data.password, 10);
  const user = await db.user.create({
    data: { name: data.name, email: data.email.toLowerCase(), password, role, location: data.location },
  });
  return { token: signToken(user), user: publicUser(user) };
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("invalid_credentials");
  }
  return { token: signToken(user), user: publicUser(user) };
}

export function publicUser(u: { id: string; name: string; email: string; role: string; location: string | null }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, location: u.location };
}
