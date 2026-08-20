import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { BadRequestError } from "../lib/httpError.js";
import { prisma, TRANSACTION_OPTIONS } from "../lib/prisma.js";
import { deleteUploadedFile } from "../lib/uploads.js";
import { getOrSetCache, invalidateCachePattern } from "../services/CacheService.js";
import { idParamSchema } from "../validators/common.js";
import {
  adjustStockBatchSchema,
  createRawMaterialBatchSchema,
  createRawMaterialSchema,
  deleteRawMaterialBatchSchema,
  listRawMaterialsQuerySchema,
  updateRawMaterialSchema,
} from "../validators/rawMaterial.js";

export const rawMaterialsRouter = Router();

// Keyed per categoryId filter (including "no filter") so each variant of the
// list gets its own cached entry; invalidation clears the whole family at once.
const LIST_CACHE_PREFIX = "raw-materials:list";
const LIST_CACHE_TTL_SECONDS = 60;

rawMaterialsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { categoryId } = listRawMaterialsQuerySchema.parse(req.query);
    const cacheKey = `${LIST_CACHE_PREFIX}:${categoryId ?? "all"}`;
    const rawMaterials = await getOrSetCache(cacheKey, LIST_CACHE_TTL_SECONDS, () =>
      prisma.rawMaterial.findMany({
        where: categoryId ? { categoryId } : undefined,
        orderBy: { name: "asc" },
        include: { category: true },
      }),
    );
    res.json(rawMaterials);
  }),
);

rawMaterialsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const rawMaterial = await prisma.rawMaterial.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });
    res.json(rawMaterial);
  }),
);

rawMaterialsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createRawMaterialSchema.parse(req.body);
    const rawMaterial = await prisma.rawMaterial.create({ data, include: { category: true } });
    invalidateCachePattern(LIST_CACHE_PREFIX);
    res.status(201).json(rawMaterial);
  }),
);

rawMaterialsRouter.post(
  "/batch",
  asyncHandler(async (req, res) => {
    const { items } = createRawMaterialBatchSchema.parse(req.body);
    const created = await prisma.$transaction(
      items.map((data) => prisma.rawMaterial.create({ data, include: { category: true } })),
      TRANSACTION_OPTIONS,
    );
    invalidateCachePattern(LIST_CACHE_PREFIX);
    res.status(201).json(created);
  }),
);

rawMaterialsRouter.post(
  "/adjust-stock-batch",
  asyncHandler(async (req, res) => {
    const { adjustments } = adjustStockBatchSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const { id, delta } of adjustments) {
        const current = await tx.rawMaterial.findUniqueOrThrow({ where: { id } });
        const nextQuantity = current.quantity + delta;

        if (nextQuantity < 0) {
          throw new BadRequestError(
            `Adjustment would result in negative stock for ${current.name} (${current.sku}).`,
          );
        }

        results.push(
          await tx.rawMaterial.update({
            where: { id },
            data: { quantity: nextQuantity },
            include: { category: true },
          }),
        );
      }
      return results;
    }, TRANSACTION_OPTIONS);

    invalidateCachePattern(LIST_CACHE_PREFIX);
    res.json(updated);
  }),
);

rawMaterialsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = updateRawMaterialSchema.parse(req.body);

    const previous =
      data.imageUrl !== undefined
        ? await prisma.rawMaterial.findUnique({ where: { id }, select: { imageUrl: true } })
        : null;

    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data,
      include: { category: true },
    });

    if (previous && previous.imageUrl && previous.imageUrl !== data.imageUrl) {
      await deleteUploadedFileIfUnreferenced(previous.imageUrl, id);
    }

    invalidateCachePattern(LIST_CACHE_PREFIX);
    res.json(rawMaterial);
  }),
);

rawMaterialsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await prisma.rawMaterial.delete({ where: { id } });
    await deleteUploadedFileIfUnreferenced(deleted.imageUrl, id);
    invalidateCachePattern(LIST_CACHE_PREFIX);
    res.status(204).send();
  }),
);

rawMaterialsRouter.post(
  "/delete-batch",
  asyncHandler(async (req, res) => {
    const { ids } = deleteRawMaterialBatchSchema.parse(req.body);

    const deleted = await prisma.$transaction(
      ids.map((id) => prisma.rawMaterial.delete({ where: { id } })),
      TRANSACTION_OPTIONS,
    );

    const uniqueImageUrls = [...new Set(deleted.map((item) => item.imageUrl))].filter(
      (url): url is string => Boolean(url),
    );
    for (const imageUrl of uniqueImageUrls) {
      const stillReferenced = await prisma.rawMaterial.count({ where: { imageUrl } });
      if (stillReferenced === 0) {
        await deleteUploadedFile(imageUrl);
      }
    }

    invalidateCachePattern(LIST_CACHE_PREFIX);
    res.status(204).send();
  }),
);

// Apparel variants often share one photo across the whole product (same imageUrl on
// every color/size sibling), so the file can only be removed once no raw material —
// including the one just deleted — references it anymore.
async function deleteUploadedFileIfUnreferenced(imageUrl: string | null, excludeId: string) {
  if (!imageUrl) return;
  const stillReferenced = await prisma.rawMaterial.count({
    where: { imageUrl, id: { not: excludeId } },
  });
  if (stillReferenced === 0) {
    await deleteUploadedFile(imageUrl);
  }
}
