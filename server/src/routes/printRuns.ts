import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError, ConflictError } from "../lib/httpError.js";
import { prisma, TRANSACTION_OPTIONS } from "../lib/prisma.js";
import { usesDtf } from "../lib/printType.js";
import { logActivity } from "../services/ActivityLogService.js";
import { invalidateCacheKey, invalidateCachePattern } from "../services/CacheService.js";
import { recordFinishedGoodSale } from "../services/SaleService.js";
import { idParamSchema } from "../validators/common.js";
import {
  createPrintRunSchema,
  updatePrintRunItemSchema,
  updatePrintRunSchema,
} from "../validators/printRun.js";
import { FINISHED_GOODS_LIST_CACHE_KEY } from "./finishedGoods.js";
import { LIST_CACHE_PREFIX as RAW_MATERIALS_LIST_CACHE_PREFIX } from "./rawMaterials.js";
import { SALES_LIST_CACHE_PREFIX } from "./sales.js";
import { SHIRT_DESIGNS_LIST_CACHE_KEY } from "./shirtDesigns.js";

export const printRunsRouter = Router();

const printRunInclude = {
  items: { include: { design: true, colorway: true, sizes: true } },
} as const;

printRunsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const printRuns = await prisma.printRun.findMany({
      orderBy: { createdAt: "desc" },
      include: printRunInclude,
    });
    res.json(printRuns);
  }),
);

printRunsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const printRun = await prisma.printRun.findUniqueOrThrow({
      where: { id },
      include: printRunInclude,
    });
    res.json(printRun);
  }),
);

printRunsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { items } = createPrintRunSchema.parse(req.body);
    const printRun = await prisma.printRun.create({
      data: {
        items: {
          create: items.map((item) => ({
            designId: item.designId,
            colorwayId: item.colorwayId,
            garmentStyle: item.garmentStyle,
            color: item.color,
            sizes: { create: item.sizes },
          })),
        },
      },
      include: printRunInclude,
    });
    logActivity({
      action: "CREATE",
      entityType: "PrintRun",
      entityId: printRun.id,
      message: `Created a print run with ${printRun.items.length} line${printRun.items.length === 1 ? "" : "s"}`,
      userId: req.user?.sub,
    });
    res.status(201).json(printRun);
  }),
);

printRunsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { items } = updatePrintRunSchema.parse(req.body);

    const existing = await prisma.printRun.findUniqueOrThrow({ where: { id } });
    if (existing.status === "FINISHED") {
      throw new ConflictError("Finished print runs can't be edited.");
    }

    const printRun = await prisma.$transaction(async (tx) => {
      // Items (and their sizes, cascading) have no outside references, so a
      // clean delete-and-recreate is safe here — nothing to orphan.
      await tx.printRunItem.deleteMany({ where: { printRunId: id } });
      for (const item of items) {
        await tx.printRunItem.create({
          data: {
            printRunId: id,
            designId: item.designId,
            colorwayId: item.colorwayId,
            garmentStyle: item.garmentStyle,
            color: item.color,
            sizes: { create: item.sizes },
          },
        });
      }
      return tx.printRun.findUniqueOrThrow({ where: { id }, include: printRunInclude });
    }, TRANSACTION_OPTIONS);

    logActivity({
      action: "UPDATE",
      entityType: "PrintRun",
      entityId: printRun.id,
      message: `Edited print run (${printRun.items.length} line${printRun.items.length === 1 ? "" : "s"})`,
      userId: req.user?.sub,
    });
    res.json(printRun);
  }),
);

// Marks a single design line within a run as done/undone. This tracks
// production progress independently of the run's own status — it's not
// gated on the run being PLANNED or FINISHED, and never touches inventory.
printRunsRouter.patch(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { done } = updatePrintRunItemSchema.parse(req.body);
    const item = await prisma.printRunItem.update({
      where: { id },
      data: { done },
      include: { design: true, colorway: true, sizes: true },
    });
    res.json(item);
  }),
);

printRunsRouter.post(
  "/:id/finish",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);

    const { printRun, stockDeducted } = await prisma.$transaction(async (tx) => {
      const run = await tx.printRun.findUniqueOrThrow({
        where: { id },
        include: {
          items: {
            include: {
              sizes: true,
              design: { select: { printType: true, designName: true } },
              colorway: true,
            },
          },
        },
      });

      if (run.status === "FINISHED") {
        throw new ConflictError("This print run has already been finished.");
      }

      let stockDeducted = 0;

      // Blank-shirt raw materials are named with the fit ("Boxy" / "Oversized")
      // in the title and carry their own color + size, so each printed size on
      // each design line is matched against the one blank that fits all three
      // before deducting.
      for (const item of run.items) {
        let totalFreshPieces = 0;
        for (const sizeLine of item.sizes) {
          // This exact variation may already be sitting in On-Hand Stock —
          // meaning today's order for it was actually fulfilled from that
          // existing stock rather than needing a fresh print. Checked first
          // so the "fresh" quantity below excludes it: that stock was
          // already printed (and its blank/DTF sheet already consumed)
          // whenever it was originally made, so deducting the full requested
          // amount again here would double-count material for those pieces.
          const finishedGood = await tx.finishedGood.findFirst({
            where: {
              designId: item.designId,
              colorwayId: item.colorwayId,
              garmentStyle: item.garmentStyle,
              color: item.color,
              size: sizeLine.size,
            },
          });

          const covered =
            finishedGood && finishedGood.quantityOnHand > 0
              ? Math.min(finishedGood.quantityOnHand, sizeLine.quantity)
              : 0;
          const freshQuantity = sizeLine.quantity - covered;
          totalFreshPieces += freshQuantity;

          if (covered > 0) {
            await tx.finishedGood.update({
              where: { id: finishedGood!.id },
              data: { quantityOnHand: { decrement: covered } },
            });
            await recordFinishedGoodSale(
              tx,
              {
                id: finishedGood!.id,
                designId: item.designId,
                designName: item.design.designName,
                garmentStyle: item.garmentStyle,
                color: item.color,
                size: sizeLine.size,
                unitPrice: finishedGood!.unitPrice,
              },
              covered,
            );
            stockDeducted += covered;
          }

          // Nothing fresh needed for this size — it was fully covered by
          // existing stock above, so no blank is consumed and no raw
          // material record needs to exist for it.
          if (freshQuantity === 0) continue;

          const rawMaterial = await tx.rawMaterial.findFirst({
            where: {
              name: { contains: item.garmentStyle, mode: "insensitive" },
              color: { equals: item.color, mode: "insensitive" },
              size: sizeLine.size,
            },
          });

          if (!rawMaterial) {
            throw new BadRequestError(
              `No raw material found for ${item.garmentStyle} / ${item.color} / ${sizeLine.size}.`,
            );
          }
          if (rawMaterial.quantity < freshQuantity) {
            throw new BadRequestError(
              `Not enough ${rawMaterial.name} (${rawMaterial.color} ${rawMaterial.size}) on hand — need ${freshQuantity}, have ${rawMaterial.quantity}.`,
            );
          }

          await tx.rawMaterial.update({
            where: { id: rawMaterial.id },
            data: { quantity: { decrement: freshQuantity } },
          });
        }

        // DTF lines also draw down on-hand printed-transfer-sheet stock,
        // tracked per colorway rather than per size — one printed sheet
        // covers the whole run of that colorway regardless of garment size.
        // Only the fresh portion needs a sheet; anything fulfilled from
        // existing On-Hand Stock already had its sheet consumed earlier.
        if (usesDtf(item.design.printType) && totalFreshPieces > 0) {
          if (!item.colorway) {
            throw new BadRequestError(
              `${item.garmentStyle} / ${item.color} is a DTF design line with no colorway set — can't deduct DTF print stock.`,
            );
          }
          if (item.colorway.dtfStockQuantity < totalFreshPieces) {
            throw new BadRequestError(
              `Not enough DTF print stock for "${item.colorway.colorwayName}" — need ${totalFreshPieces}, have ${item.colorway.dtfStockQuantity}.`,
            );
          }
          await tx.designColorway.update({
            where: { id: item.colorway.id },
            data: { dtfStockQuantity: { decrement: totalFreshPieces } },
          });
        }
      }

      const updated = await tx.printRun.update({
        where: { id },
        data: { status: "FINISHED", finishedAt: new Date() },
        include: printRunInclude,
      });

      return { printRun: updated, stockDeducted };
    }, TRANSACTION_OPTIONS);

    // Finishing deducts RawMaterial.quantity for every item, and
    // DesignColorway.dtfStockQuantity for DTF items — both cached
    // separately from this route's own PrintRun data. On-hand stock (and the
    // Sales it generates) only actually changed if any line matched
    // something already on the shelf.
    invalidateCachePattern(RAW_MATERIALS_LIST_CACHE_PREFIX);
    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    if (stockDeducted > 0) {
      invalidateCacheKey(FINISHED_GOODS_LIST_CACHE_KEY);
      invalidateCachePattern(SALES_LIST_CACHE_PREFIX);
    }
    logActivity({
      action: "UPDATE",
      entityType: "PrintRun",
      entityId: printRun.id,
      message:
        `Finished print run (${printRun.items.length} line${printRun.items.length === 1 ? "" : "s"}) — raw materials deducted` +
        (stockDeducted > 0 ? `, ${stockDeducted} pc${stockDeducted === 1 ? "" : "s"} fulfilled from on-hand stock` : ""),
      userId: req.user?.sub,
    });
    res.json({ ...printRun, stockDeducted });
  }),
);

printRunsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const existing = await prisma.printRun.findUniqueOrThrow({ where: { id } });
    if (existing.status === "FINISHED") {
      throw new ConflictError("Finished print runs are part of the production log and can't be deleted.");
    }
    await prisma.printRun.delete({ where: { id } });
    logActivity({
      action: "DELETE",
      entityType: "PrintRun",
      entityId: id,
      message: "Deleted a planned print run",
      userId: req.user?.sub,
    });
    res.status(204).send();
  }),
);
