import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma, TRANSACTION_OPTIONS } from "../lib/prisma.js";
import { idParamSchema } from "../validators/common.js";
import { createShirtDesignSchema, updateShirtDesignSchema } from "../validators/shirtDesign.js";

export const shirtDesignsRouter = Router();

shirtDesignsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const designs = await prisma.shirtDesign.findMany({
      orderBy: { createdAt: "desc" },
      include: { colorways: { include: { screens: true } } },
    });
    res.json(designs);
  }),
);

shirtDesignsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const design = await prisma.shirtDesign.findUniqueOrThrow({
      where: { id },
      include: { colorways: { include: { screens: true } }, finishedGoods: true },
    });
    res.json(design);
  }),
);

shirtDesignsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { colorways, ...data } = createShirtDesignSchema.parse(req.body);
    const design = await prisma.shirtDesign.create({
      data: {
        ...data,
        // A brand-new design can't have pre-existing colorway ids yet, so ignore
        // any `id` the client sent and let Prisma generate fresh ones.
        colorways: colorways
          ? {
              create: colorways.map(({ colorwayName, imageUrl, dtfPrintSize }) => ({
                colorwayName,
                imageUrl,
                dtfPrintSize,
              })),
            }
          : undefined,
      },
      include: { colorways: true },
    });
    res.status(201).json(design);
  }),
);

shirtDesignsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { colorways, ...data } = updateShirtDesignSchema.parse(req.body);

    const design = await prisma.$transaction(async (tx) => {
      if (colorways) {
        // Update existing colorways in place (by id) rather than deleting and
        // recreating them — recreating would issue new ids and silently drop
        // any screen already linked to the old colorway row.
        const existing = await tx.designColorway.findMany({
          where: { shirtDesignId: id },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((c) => c.id));
        const keepIds = new Set(
          colorways.filter((c) => c.id && existingIds.has(c.id)).map((c) => c.id!),
        );
        const removedIds = [...existingIds].filter((colorwayId) => !keepIds.has(colorwayId));

        if (removedIds.length > 0) {
          await tx.designColorway.deleteMany({ where: { id: { in: removedIds } } });
        }
        for (const colorway of colorways) {
          if (colorway.id && existingIds.has(colorway.id)) {
            await tx.designColorway.update({
              where: { id: colorway.id },
              data: {
                colorwayName: colorway.colorwayName,
                imageUrl: colorway.imageUrl,
                dtfPrintSize: colorway.dtfPrintSize,
              },
            });
          } else {
            await tx.designColorway.create({
              data: {
                colorwayName: colorway.colorwayName,
                imageUrl: colorway.imageUrl,
                dtfPrintSize: colorway.dtfPrintSize,
                shirtDesignId: id,
              },
            });
          }
        }
      }

      return tx.shirtDesign.update({
        where: { id },
        data,
        include: { colorways: true },
      });
    }, TRANSACTION_OPTIONS);

    res.json(design);
  }),
);

shirtDesignsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.shirtDesign.delete({ where: { id } });
    res.status(204).send();
  }),
);
