import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError } from "../lib/httpError.js";
import { prisma, TRANSACTION_OPTIONS } from "../lib/prisma.js";
import { logActivity } from "../services/ActivityLogService.js";
import { getOrSetCache, invalidateCacheKey } from "../services/CacheService.js";
import { idParamSchema } from "../validators/common.js";
import {
  adjustStockSchema,
  createFinishedGoodSchema,
  updateFinishedGoodSchema,
} from "../validators/finishedGood.js";

export const finishedGoodsRouter = Router();

const LIST_CACHE_KEY = "finished-goods:list";
const LIST_CACHE_TTL_SECONDS = 60;

finishedGoodsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const finishedGoods = await getOrSetCache(LIST_CACHE_KEY, LIST_CACHE_TTL_SECONDS, () =>
      prisma.finishedGood.findMany({
        orderBy: { createdAt: "desc" },
        include: { design: true, colorway: true },
      }),
    );
    res.json(finishedGoods);
  }),
);

finishedGoodsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const finishedGood = await prisma.finishedGood.findUniqueOrThrow({
      where: { id },
      include: { design: true, colorway: true },
    });
    res.json(finishedGood);
  }),
);

finishedGoodsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createFinishedGoodSchema.parse(req.body);
    const finishedGood = await prisma.finishedGood.create({
      data,
      include: { design: true, colorway: true },
    });
    invalidateCacheKey(LIST_CACHE_KEY);
    logActivity({
      action: "CREATE",
      entityType: "FinishedGood",
      entityId: finishedGood.id,
      message: `Added stock line "${finishedGood.design.designName} — ${finishedGood.color} / ${finishedGood.size}"`,
      userId: req.user?.sub,
    });
    res.status(201).json(finishedGood);
  }),
);

finishedGoodsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = updateFinishedGoodSchema.parse(req.body);
    const finishedGood = await prisma.finishedGood.update({
      where: { id },
      data,
      include: { design: true, colorway: true },
    });
    invalidateCacheKey(LIST_CACHE_KEY);
    logActivity({
      action: "UPDATE",
      entityType: "FinishedGood",
      entityId: finishedGood.id,
      message: `Updated stock line "${finishedGood.design.designName} — ${finishedGood.color} / ${finishedGood.size}"`,
      userId: req.user?.sub,
    });
    res.json(finishedGood);
  }),
);

finishedGoodsRouter.post(
  "/:id/adjust-stock",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { delta, unitPrice } = adjustStockSchema.parse(req.body);

    const finishedGood = await prisma.$transaction(async (tx) => {
      const current = await tx.finishedGood.findUniqueOrThrow({
        where: { id },
        include: { design: true },
      });
      const nextQuantity = current.quantityOnHand + delta;

      if (nextQuantity < 0) {
        throw new BadRequestError(
          `Adjustment would result in negative stock (${current.quantityOnHand} + ${delta}).`,
        );
      }

      // A negative delta means stock is leaving through a sale (as opposed to
      // a positive delta, which is new stock coming in) — log it so revenue
      // reporting has something real to work with.
      if (delta < 0) {
        const quantity = -delta;
        await tx.sale.create({
          data: {
            finishedGoodId: current.id,
            designId: current.designId,
            designName: current.design.designName,
            garmentStyle: current.garmentStyle,
            color: current.color,
            size: current.size,
            quantity,
            unitPrice: current.unitPrice,
            totalPrice: current.unitPrice !== null ? current.unitPrice * quantity : null,
          },
        });
      }

      return tx.finishedGood.update({
        where: { id },
        data: { quantityOnHand: nextQuantity, ...(unitPrice !== undefined ? { unitPrice } : {}) },
        include: { design: true, colorway: true },
      });
    }, TRANSACTION_OPTIONS);

    invalidateCacheKey(LIST_CACHE_KEY);
    logActivity({
      action: "STOCK_ADJUST",
      entityType: "FinishedGood",
      entityId: finishedGood.id,
      message: `${delta >= 0 ? "Restocked" : "Sold"} ${Math.abs(delta)} × "${finishedGood.design.designName} — ${finishedGood.color} / ${finishedGood.size}" (now ${finishedGood.quantityOnHand})`,
      userId: req.user?.sub,
    });
    res.json(finishedGood);
  }),
);

finishedGoodsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await prisma.finishedGood.delete({
      where: { id },
      include: { design: true },
    });
    invalidateCacheKey(LIST_CACHE_KEY);
    logActivity({
      action: "DELETE",
      entityType: "FinishedGood",
      entityId: deleted.id,
      message: `Deleted stock line "${deleted.design.designName} — ${deleted.color} / ${deleted.size}"`,
      userId: req.user?.sub,
    });
    res.status(204).send();
  }),
);
