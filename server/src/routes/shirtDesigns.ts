import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { Prisma } from "../generated/prisma/client.js";
import { ConflictError } from "../lib/httpError.js";
import { prisma, TRANSACTION_OPTIONS } from "../lib/prisma.js";
import { getOrSetCache, invalidateCacheKey } from "../services/CacheService.js";
import { idParamSchema } from "../validators/common.js";
import { createShirtDesignSchema, updateShirtDesignSchema } from "../validators/shirtDesign.js";

export const shirtDesignsRouter = Router();

// This is the most-read resource in the app (Designs, Screen Rack, DTF
// Prints, Print Runs, and stock forms all pull the full list on mount) and
// previously had no server-side cache at all, unlike raw-materials/screens/
// finished-goods — every navigation cost a full round trip to Neon. Short
// TTL because colorway screen links and dtfStockQuantity change fairly
// often; anything that touches those (screens.ts, dtfPrintStock.ts,
// printRuns.ts's finish route) also invalidates this key.
export const SHIRT_DESIGNS_LIST_CACHE_KEY = "shirt-designs:list";
const LIST_CACHE_TTL_SECONDS = 60;

// Screens are shared many-to-many with colorways, so unlinking one here
// doesn't necessarily free it up — it might still be covering another
// colorway. Only screens left with zero colorways after the unlink actually
// get reset. NEEDS_RECLAIM rather than CLEAN_RECLAIMED because the physical
// screen still has emulsion on it — deleting/editing a design here doesn't
// wash it, it just means whatever's on it no longer belongs to a live design.
async function freeOrphanedScreens(tx: Prisma.TransactionClient, screenIds: string[]) {
  if (screenIds.length === 0) return;
  const orphaned = await tx.physicalScreen.findMany({
    where: { id: { in: screenIds }, colorways: { none: {} } },
    select: { id: true },
  });
  if (orphaned.length === 0) return;
  await tx.physicalScreen.updateMany({
    where: { id: { in: orphaned.map((screen) => screen.id) } },
    data: { status: "NEEDS_RECLAIM" },
  });
}

shirtDesignsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const designs = await getOrSetCache(SHIRT_DESIGNS_LIST_CACHE_KEY, LIST_CACHE_TTL_SECONDS, () =>
      prisma.shirtDesign.findMany({
        orderBy: { createdAt: "desc" },
        include: { colorways: { include: { screens: { orderBy: { createdAt: "asc" } } } } },
      }),
    );
    res.json(designs);
  }),
);

shirtDesignsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const design = await prisma.shirtDesign.findUniqueOrThrow({
      where: { id },
      include: {
        colorways: { include: { screens: { orderBy: { createdAt: "asc" } } } },
        finishedGoods: true,
      },
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
              create: colorways.map(({ colorwayName, imageUrl, dtfPrintSize, screensNeeded }) => ({
                colorwayName,
                imageUrl,
                dtfPrintSize,
                screensNeeded,
              })),
            }
          : undefined,
      },
      include: { colorways: true },
    });
    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
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
          // The many-to-many join rows cascade-delete with the colorway, but
          // that alone leaves any now-unlinked screen sitting at whatever
          // status it was left in — free it up here instead.
          const screensOnRemoved = await tx.physicalScreen.findMany({
            where: { colorways: { some: { id: { in: removedIds } } } },
            select: { id: true },
          });
          await tx.designColorway.deleteMany({ where: { id: { in: removedIds } } });
          await freeOrphanedScreens(
            tx,
            screensOnRemoved.map((screen) => screen.id),
          );
        }
        for (const colorway of colorways) {
          if (colorway.id && existingIds.has(colorway.id)) {
            // Dropping the screen count (e.g. 2 -> 1) frees up whichever
            // screen(s) were linked last, keeping the earliest-linked ones —
            // same "Screen 1" / "Screen 2" ordering shown on the Designs page.
            const current = await tx.designColorway.findUniqueOrThrow({
              where: { id: colorway.id },
              include: { screens: { orderBy: { createdAt: "asc" }, select: { id: true } } },
            });
            const excessScreens = current.screens.slice(colorway.screensNeeded);

            await tx.designColorway.update({
              where: { id: colorway.id },
              data: {
                colorwayName: colorway.colorwayName,
                imageUrl: colorway.imageUrl,
                dtfPrintSize: colorway.dtfPrintSize,
                screensNeeded: colorway.screensNeeded,
                screens:
                  excessScreens.length > 0
                    ? { disconnect: excessScreens.map((screen) => ({ id: screen.id })) }
                    : undefined,
              },
            });

            if (excessScreens.length > 0) {
              await freeOrphanedScreens(
                tx,
                excessScreens.map((screen) => screen.id),
              );
            }
          } else {
            await tx.designColorway.create({
              data: {
                colorwayName: colorway.colorwayName,
                imageUrl: colorway.imageUrl,
                dtfPrintSize: colorway.dtfPrintSize,
                screensNeeded: colorway.screensNeeded,
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

    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    res.json(design);
  }),
);

shirtDesignsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);

    // PrintRunItem.designId and FinishedGood.designId are both protected
    // references (production and stock history — see the Unlist comment on
    // the schema), so this would otherwise fail deep in a raw FK-constraint
    // error. Check first for a clear message; the Designs page itself no
    // longer offers hard delete for exactly this reason, but the API stays
    // available for designs that truly have neither.
    const [printRunItemCount, finishedGoodCount] = await Promise.all([
      prisma.printRunItem.count({ where: { designId: id } }),
      prisma.finishedGood.count({ where: { designId: id } }),
    ]);
    if (printRunItemCount > 0 || finishedGoodCount > 0) {
      throw new ConflictError(
        "This design has print run or finished-stock history and can't be deleted — unlist it instead.",
      );
    }

    await prisma.$transaction(async (tx) => {
      // Colorways (and their join rows with screens) cascade-delete with the
      // design, but that alone leaves any now-orphaned screen at whatever
      // status it was left in — free those up too.
      const linkedScreens = await tx.physicalScreen.findMany({
        where: { colorways: { some: { shirtDesignId: id } } },
        select: { id: true },
      });
      await tx.shirtDesign.delete({ where: { id } });
      await freeOrphanedScreens(
        tx,
        linkedScreens.map((screen) => screen.id),
      );
    }, TRANSACTION_OPTIONS);

    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    res.status(204).send();
  }),
);
