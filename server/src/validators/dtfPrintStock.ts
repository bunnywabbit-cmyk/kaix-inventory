import { z } from "zod";

export const addDtfStockSchema = z.object({
  colorwayId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
