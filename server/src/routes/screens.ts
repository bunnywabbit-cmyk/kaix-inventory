import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../services/ActivityLogService.js";
import { getOrSetCache, invalidateCacheKey } from "../services/CacheService.js";
import { idParamSchema } from "../validators/common.js";
import { createScreenSchema, updateScreenSchema } from "../validators/screen.js";
import { SHIRT_DESIGNS_LIST_CACHE_KEY } from "./shirtDesigns.js";

export const screensRouter = Router();

const colorwayInclude = { colorways: { include: { shirtDesign: true } } } as const;

const LIST_CACHE_KEY = "screens:list";
// Screens change status far less often than stock does, so this can sit
// longer — 5 minutes, matching the spec.
const LIST_CACHE_TTL_SECONDS = 5 * 60;

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
    const screen = await prisma.physicalScreen.create({
      data: {
        ...data,
        colorways: { connect: colorwayIds.map((id) => ({ id })) },
      },
      include: colorwayInclude,
    });
    invalidateCacheKey(LIST_CACHE_KEY);
    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    logActivity({
      action: "CREATE",
      entityType: "PhysicalScreen",
      entityId: screen.id,
      message: `Added ${screen.screenNumber}`,
      userId: req.user?.sub,
    });
    res.status(201).json(screen);
  }),
);

screensRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const { colorwayIds, ...data } = updateScreenSchema.parse(req.body);
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
    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    logActivity({
      action: "UPDATE",
      entityType: "PhysicalScreen",
      entityId: screen.id,
      message: `Updated ${screen.screenNumber} (${screen.status.replaceAll("_", " ").toLowerCase()}, ${screen.colorways.length} colorway${screen.colorways.length === 1 ? "" : "s"})`,
      userId: req.user?.sub,
    });
    res.json(screen);
  }),
);

screensRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await prisma.physicalScreen.delete({ where: { id } });
    invalidateCacheKey(LIST_CACHE_KEY);
    invalidateCacheKey(SHIRT_DESIGNS_LIST_CACHE_KEY);
    logActivity({
      action: "DELETE",
      entityType: "PhysicalScreen",
      entityId: deleted.id,
      message: `Deleted ${deleted.screenNumber}`,
      userId: req.user?.sub,
    });
    res.status(204).send();
  }),
);
