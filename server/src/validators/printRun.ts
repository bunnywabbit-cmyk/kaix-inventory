import { z } from "zod";

const sizeSchema = z.object({
  size: z.string().trim().min(1, "size is required"),
  quantity: z.number().int().positive("quantity must be positive"),
});

const itemSchema = z.object({
  designId: z.string().uuid("designId must be a valid UUID"),
  colorwayId: z.string().uuid().nullable().optional(),
  garmentStyle: z.string().trim().min(1, "garmentStyle is required"),
  color: z.string().trim().min(1, "color is required"),
  sizes: z.array(sizeSchema).min(1, "At least one size is required"),
});

export const createPrintRunSchema = z.object({
  items: z.array(itemSchema).min(1, "At least one design is required"),
});

export const updatePrintRunSchema = z.object({
  items: z.array(itemSchema).min(1, "At least one design is required"),
});

export const updatePrintRunItemSchema = z.object({
  done: z.boolean(),
});
