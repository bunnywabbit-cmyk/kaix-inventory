import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { invalidateCacheKey } from "../services/CacheService.js";
import { addDtfStockSchema } from "../validators/dtfPrintStock.js";
import { SHIRT_DESIGNS_LIST_CACHE_KEY } from "./shirtDesigns.js";

export const dtfPrintStockRouter = Router();

// Increments on-hand DTF print stock for one colorway. There's no separate
// "stock" resource — the running total lives directly on DesignColorway
// (dtfStockQuantity), the same way screensNeeded does, since it's a 1:1
// property of that colorway's print file. This endpoint is purely additive;
// finishing a print run is what decrements it.
dtfPrintStockRouter.post(
  "/add",
  asyncHandler(async (req, res) => {
    const { colorwayId, quantity } = addDtfStockSchema.parse(req.body);
    const colorway = await prisma.designColorway.update({
      where: { id: colorwayId },
      data: { dtfStockQuantity: { increment: quantity } },
      include: { shirtDesign: true },
    });
    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    res.json(colorway);
  }),
);
