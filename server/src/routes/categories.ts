import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { idParamSchema } from "../validators/common.js";
import { createCategorySchema, updateCategorySchema } from "../validators/category.js";

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { rawMaterials: true } } },
    });
    res.json(categories);
  }),
);

categoriesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const category = await prisma.category.findUniqueOrThrow({
      where: { id },
      include: { rawMaterials: true },
    });
    res.json(category);
  }),
);

categoriesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json(category);
  }),
);

categoriesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = updateCategorySchema.parse(req.body);
    const category = await prisma.category.update({ where: { id }, data });
    res.json(category);
  }),
);

categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  }),
);
