import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { ConflictError } from "../lib/httpError.js";
import { prisma } from "../lib/prisma.js";
import { getOrSetCache, invalidateCacheKey } from "../services/CacheService.js";
import { idParamSchema } from "../validators/common.js";
import { createScreenSchema, updateScreenSchema } from "../validators/screen.js";

export const screensRouter = Router();

const colorwayInclude = { colorways: { include: { shirtDesign: true } } } as const;

const LIST_CACHE_KEY = "screens:list";
// Screens change status far less often than stock does, so this can sit
// longer — 5 minutes, matching the spec.
const LIST_CACHE_TTL_SECONDS = 5 * 60;

// A colorway belongs to at most one screen at a time (a screen can still hold several
// colorways). Re-checked here so a stale client or a race can't silently steal a
// colorway that's already claimed by a different screen.
async function assertColorwaysAvailable(colorwayIds: string[], excludeScreenId?: string) {
  if (colorwayIds.length === 0) return;
  const colorways = await prisma.designColorway.findMany({
    where: { id: { in: colorwayIds } },
    include: { screens: { select: { id: true, screenNumber: true } } },
  });
  for (const colorway of colorways) {
    const conflict = colorway.screens.find((screen) => screen.id !== excludeScreenId);
    if (conflict) {
      throw new ConflictError(
        `"${colorway.colorwayName}" is already linked to ${conflict.screenNumber}.`,
      );
    }
  }
}

screensRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const screens = await getOrSetCache(LIST_CACHE_KEY, LIST_CACHE_TTL_SECONDS, () =>
      prisma.physicalScreen.findMany({
        orderBy: { screenNumber: "asc" },
        include: colorwayInclude,
      }),
    );
    res.json(screens);
  }),
);

screensRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const screen = await prisma.physicalScreen.findUniqueOrThrow({
      where: { id },
      include: colorwayInclude,
    });
    res.json(screen);
  }),
);

screensRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { colorwayIds, ...data } = createScreenSchema.parse(req.body);
    await assertColorwaysAvailable(colorwayIds);
    const screen = await prisma.physicalScreen.create({
      data: {
        ...data,
        colorways: { connect: colorwayIds.map((id) => ({ id })) },
      },
      include: colorwayInclude,
    });
    invalidateCacheKey(LIST_CACHE_KEY);
    res.status(201).json(screen);
  }),
);

screensRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { colorwayIds, ...data } = updateScreenSchema.parse(req.body);
    if (colorwayIds !== undefined) {
      await assertColorwaysAvailable(colorwayIds, id);
    }
    const screen = await prisma.physicalScreen.update({
      where: { id },
      data: {
        ...data,
        colorways:
          colorwayIds !== undefined ? { set: colorwayIds.map((id) => ({ id })) } : undefined,
      },
      include: colorwayInclude,
    });
    invalidateCacheKey(LIST_CACHE_KEY);
    res.json(screen);
  }),
);

screensRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.physicalScreen.delete({ where: { id } });
    invalidateCacheKey(LIST_CACHE_KEY);
    res.status(204).send();
  }),
);
