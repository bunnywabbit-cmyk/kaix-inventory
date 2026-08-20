import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { UnauthorizedError } from "../lib/httpError.js";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  signAccessToken,
} from "../lib/jwt.js";
import { isPinRateLimited, recordFailedPinAttempt, resetPinAttempts } from "../lib/pinRateLimit.js";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(1, "password is required"),
});

const loginPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});

function toProfile(user: { id: string; email: string; role: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — don't tell an
  // attacker which half of the pair was wrong.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const token = signAccessToken({ sub: user.id, role: user.role });
  res.cookie(ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.json(toProfile(user));
}

export async function loginPin(req: Request, res: Response) {
  const { pin } = loginPinSchema.parse(req.body);

  const rateLimitKey = req.ip ?? "unknown";
  if (isPinRateLimited(rateLimitKey)) {
    throw new UnauthorizedError("Too many PIN attempts. Try again in a few minutes.");
  }

  // bcrypt hashes can't be looked up by equality — every candidate has to be
  // compared individually. Fine for this app's handful of accounts; each
  // login attempt is a login attempt either way, so it's counted the same.
  const candidates = await prisma.user.findMany({ where: { pinHash: { not: null } } });

  let matched: (typeof candidates)[number] | null = null;
  for (const candidate of candidates) {
    if (candidate.pinHash && (await bcrypt.compare(pin, candidate.pinHash))) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    recordFailedPinAttempt(rateLimitKey);
    throw new UnauthorizedError("Invalid PIN.");
  }
  resetPinAttempts(rateLimitKey);

  const token = signAccessToken({ sub: matched.id, role: matched.role });
  res.cookie(ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.json(toProfile(matched));
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  // requireAuth has already verified the cookie and attached req.user by
  // the time this handler runs — this just loads the fresh profile.
  const userId = req.user?.sub;
  if (!userId) throw new UnauthorizedError("Not signed in.");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError("Not signed in.");

  res.json(toProfile(user));
}
