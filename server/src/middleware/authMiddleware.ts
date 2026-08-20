import type { NextFunction, Request, Response } from "express";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "../lib/jwt.js";

// Protects a route by requiring a valid access_token cookie. Reads the raw
// cookie itself (rather than throwing an HttpError for asyncHandler to catch)
// so an expired/missing/tampered token always resolves to a plain 401 JSON
// body, never a 500 — jsonwebtoken's verify errors aren't HttpErrors.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
  if (!token) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}
