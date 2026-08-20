import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  description: z.string().trim().min(1).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
