import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError, ConflictError } from "../lib/httpError.js";
import { prisma, TRANSACTION_OPTIONS } from "../lib/prisma.js";
import { idParamSchema } from "../validators/common.js";
import {
  createPrintRunSchema,
  updatePrintRunItemSchema,
  updatePrintRunSchema,
} from "../validators/printRun.js";

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

    const printRun = await prisma.$transaction(async (tx) => {
      const run = await tx.printRun.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { sizes: true } } },
      });

      if (run.status === "FINISHED") {
        throw new ConflictError("This print run has already been finished.");
      }

      // Blank-shirt raw materials are named with the fit ("Boxy" / "Oversized")
      // in the title and carry their own color + size, so each printed size on
      // each design line is matched against the one blank that fits all three
      // before deducting.
      for (const item of run.items) {
        for (const sizeLine of item.sizes) {
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
          if (rawMaterial.quantity < sizeLine.quantity) {
            throw new BadRequestError(
              `Not enough ${rawMaterial.name} (${rawMaterial.color} ${rawMaterial.size}) on hand — need ${sizeLine.quantity}, have ${rawMaterial.quantity}.`,
            );
          }

          await tx.rawMaterial.update({
            where: { id: rawMaterial.id },
            data: { quantity: { decrement: sizeLine.quantity } },
          });
        }
      }

      return tx.printRun.update({
        where: { id },
        data: { status: "FINISHED", finishedAt: new Date() },
        include: printRunInclude,
      });
    }, TRANSACTION_OPTIONS);

    res.json(printRun);
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
    res.status(204).send();
  }),
);
