import rateLimit from "express-rate-limit";

/**
 * Global API throttle — bounds damage from unauthenticated spam.
 */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
});

/**
 * Strict limiter for the public, unauthenticated /api/verify writer.
 * Prevents scan-flood / alert-feed poisoning from a single IP.
 */
export const verifyLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
});

/**
 * Login brute-force protection.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
});
