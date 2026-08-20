import jwt from "jsonwebtoken";
import type { Role } from "../generated/prisma/enums.js";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Paste one into server/.env before using auth.");
  }
  return secret;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: SEVEN_DAYS_SECONDS });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, jwtSecret()) as AuthTokenPayload;
}

export const ACCESS_TOKEN_COOKIE = "access_token";

const isProduction = process.env.NODE_ENV === "production";

export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  // Vercel (frontend) and Render (backend) are different registrable
  // domains in production — a genuinely cross-site request — and browsers
  // only attach SameSite=Lax cookies to same-site requests, so the cookie
  // would silently never be sent. SameSite=None (which requires Secure)
  // is what actually works there. Locally, frontend and backend share
  // "localhost" as their cookie domain regardless of port, so Lax is both
  // sufficient and preferable (it doesn't require HTTPS in dev).
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  maxAge: SEVEN_DAYS_SECONDS * 1000,
};
