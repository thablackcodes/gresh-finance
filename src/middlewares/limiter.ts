import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "../config";
import { Request } from "express";

function getClientIp(req: Request): string {
  if ((req as any).currentUser?.id) {
    return `user-${(req as any).currentUser.id}`;
  }

  const ipResult = ipKeyGenerator(req as any);

  const ip =
    typeof ipResult === "string"
      ? ipResult
      : (ipResult as { ip: string }).ip;

  logger.info(
    `rate-limit key: ip-${ip} | req.ip: ${req.ip} | XFF: ${
      req.headers["x-forwarded-for"] || "none"
    }`
  );

  return `ip-${ip}`;
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many attempts from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
});


