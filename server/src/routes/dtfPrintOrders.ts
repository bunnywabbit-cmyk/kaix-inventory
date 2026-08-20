import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { idParamSchema } from "../validators/common.js";
import { createDtfPrintOrderSchema, updateDtfPrintOrderSchema } from "../validators/dtfPrintOrder.js";

export const dtfPrintOrdersRouter = Router();

const dtfPrintOrderInclude = { colorway: { include: { shirtDesign: true } } } as const;

dtfPrintOrdersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.dtfPrintOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: dtfPrintOrderInclude,
    });
    res.json(orders);
  }),
);

dtfPrintOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const order = await prisma.dtfPrintOrder.findUniqueOrThrow({
      where: { id },
      include: dtfPrintOrderInclude,
    });
    res.json(order);
  }),
);

dtfPrintOrdersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createDtfPrintOrderSchema.parse(req.body);
    const order = await prisma.dtfPrintOrder.create({
      data,
      include: dtfPrintOrderInclude,
    });
    res.status(201).json(order);
  }),
);

// Edits a line's colorway/quantity, or flips its `ordered` status — both go
// through this one route since a to-order line has nothing else to change.
dtfPrintOrdersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const data = updateDtfPrintOrderSchema.parse(req.body);
    const order = await prisma.dtfPrintOrder.update({
      where: { id },
      data,
      include: dtfPrintOrderInclude,
    });
    res.json(order);
  }),
);

dtfPrintOrdersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await prisma.dtfPrintOrder.delete({ where: { id } });
    res.status(204).send();
  }),
);
