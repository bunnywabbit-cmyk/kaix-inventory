import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { logActivity } from "../services/ActivityLogService.js";
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
    logActivity({
      action: "CREATE",
      entityType: "DtfPrintOrder",
      entityId: order.id,
      message: `Added DTF order for "${order.colorway.colorwayName}" — ${order.colorway.shirtDesign.designName} (qty ${order.quantity})`,
      userId: req.user?.sub,
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
    logActivity({
      action: "UPDATE",
      entityType: "DtfPrintOrder",
      entityId: order.id,
      message:
        data.ordered === true
          ? `Marked DTF order for "${order.colorway.colorwayName}" as ordered`
          : `Updated DTF order for "${order.colorway.colorwayName}" — ${order.colorway.shirtDesign.designName} (qty ${order.quantity})`,
      userId: req.user?.sub,
    });
    res.json(order);
  }),
);

dtfPrintOrdersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const deleted = await prisma.dtfPrintOrder.delete({
      where: { id },
      include: dtfPrintOrderInclude,
    });
    logActivity({
      action: "DELETE",
      entityType: "DtfPrintOrder",
      entityId: deleted.id,
      message: `Deleted DTF order for "${deleted.colorway.colorwayName}" — ${deleted.colorway.shirtDesign.designName}`,
      userId: req.user?.sub,
    });
    res.status(204).send();
  }),
);
