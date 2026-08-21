import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { ACTIVITY_LOG_LIST_CACHE_KEY } from "../services/ActivityLogService.js";
import { getOrSetCache } from "../services/CacheService.js";

export const activityLogRouter = Router();

const PAGE_SIZE = 30;
// Short TTL, not the 60s+ other list endpoints use — this feed is meant to
// feel live. It's safe to keep short because logActivity invalidates this
// key itself the moment a new entry is written, so staleness only ever
// comes from this TTL on an otherwise-quiet feed, never from a missed write.
const FIRST_PAGE_CACHE_TTL_SECONDS = 20;

const listQuerySchema = z.object({
  // Cursor pagination on createdAt+id rather than offset — this table only
  // grows, so an offset would drift under concurrent inserts between pages.
  cursor: z.string().uuid().optional(),
});

activityLogRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { cursor } = listQuerySchema.parse(req.query);

    const fetchPage = () =>
      prisma.activityLog.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { user: { select: { email: true } } },
      });

    // Only the first page is worth caching — it's what every page load and
    // the Dashboard's Recent Activity card hit, while deeper pages (a cursor
    // present) are one-off scrolls that don't repeat enough to be worth it.
    const entries = cursor
      ? await fetchPage()
      : await getOrSetCache(ACTIVITY_LOG_LIST_CACHE_KEY, FIRST_PAGE_CACHE_TTL_SECONDS, fetchPage);

    const hasMore = entries.length > PAGE_SIZE;
    const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries;

    res.json({
      entries: page,
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    });
  }),
);
