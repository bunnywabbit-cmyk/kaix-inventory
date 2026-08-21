import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { getOrSetCache } from "../services/CacheService.js";

export const salesRouter = Router();

// Keyed per `since` filter (including "no filter", for the All Time range),
// the same way raw-materials keys per categoryId — each range the client
// asks for gets its own cached entry. Invalidated from finishedGoods.ts's
// adjust-stock route, the only place a Sale row is ever created.
export const SALES_LIST_CACHE_PREFIX = "sales:list";
const LIST_CACHE_TTL_SECONDS = 60;

const listQuerySchema = z.object({
  // ISO timestamp — only sales at/after this are returned. Omitted entirely
  // for the "All Time" range.
  since: z.string().datetime().optional(),
});

salesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { since } = listQuerySchema.parse(req.query);
    const cacheKey = `${SALES_LIST_CACHE_PREFIX}:${since ?? "all"}`;

    const sales = await getOrSetCache(cacheKey, LIST_CACHE_TTL_SECONDS, () =>
      prisma.sale.findMany({
        where: since ? { createdAt: { gte: new Date(since) } } : undefined,
        orderBy: { createdAt: "desc" },
      }),
    );

    res.json(sales);
  }),
);
