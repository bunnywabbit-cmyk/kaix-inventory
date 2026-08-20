import { z } from "zod";

export const createDtfPrintOrderSchema = z.object({
  colorwayId: z.string().uuid("colorwayId must be a valid UUID"),
  quantity: z.number().int().positive("quantity must be greater than 0"),
});

export const updateDtfPrintOrderSchema = z
  .object({
    colorwayId: z.string().uuid("colorwayId must be a valid UUID"),
    quantity: z.number().int().positive("quantity must be greater than 0"),
    ordered: z.boolean(),
  })
  .partial();
