import type { ActivityAction } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { invalidateCacheKey } from "./CacheService.js";

interface LogActivityInput {
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  message: string;
  userId?: string | null;
}

// Owned here (rather than in routes/activityLog.ts) because this is the one
// choke point every mutation in the app already passes through — invalidating
// it here means every one of the ~20 logActivity call sites gets a fresh feed
// for free, instead of each route also having to remember to invalidate it.
export const ACTIVITY_LOG_LIST_CACHE_KEY = "activity-log:list:first-page";

// Fire-and-forget on purpose: every route that mutates something already
// pays real latency talking to Neon (see the Screen Rack save-lag fix), and
// an audit entry describing that mutation shouldn't add a second round trip
// on top of it, nor fail the mutation itself if the log write hiccups. The
// tradeoff is the log is best-effort, not a guaranteed record of every
// mutation — acceptable for an activity trail, not for anything relied on
// for correctness.
export function logActivity(input: LogActivityInput): void {
  prisma.activityLog
    .create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        message: input.message,
        userId: input.userId ?? undefined,
      },
    })
    .then(() => invalidateCacheKey(ACTIVITY_LOG_LIST_CACHE_KEY))
    .catch((err) => {
      console.error("[activity-log] failed to write entry:", err);
    });
}
