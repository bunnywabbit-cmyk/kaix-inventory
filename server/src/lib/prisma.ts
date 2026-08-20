import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Paste your Neon connection string into server/.env before starting the server.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Neon's pooled connection can take several seconds to respond under this
// project's usage, well past Prisma's 2s/5s defaults for acquiring and running
// a transaction — which surfaces as "Unable to start a transaction in the given
// time." Every $transaction call in this app should pass these explicitly.
export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };
