import { z } from "zod";

// Kept separate from the create schema's `.default(0)` fields: chaining
// `.partial()` onto a schema with `.default()` still applies the default to
// an omitted field instead of leaving it untouched, which would silently
// zero out quantity/reorderLevel on any PATCH that doesn't include them.
const quantitySchema = z.number().int().nonnegative();
const reorderLevelSchema = z.number().int().nonnegative();

const sharedFields = {
  name: z.string().trim().min(1, "name is required"),
  sku: z.string().trim().min(1, "sku is required"),
  brand: z.string().trim().min(1).optional(),
  styleNumber: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1).optional(),
  size: z.string().trim().min(1).optional(),
  unit: z.string().trim().min(1).optional(),
  imageUrl: z.string().trim().min(1).nullable().optional(),
  categoryId: z.string().uuid("categoryId must be a valid UUID"),
  pricePerUnit: z.number().nonnegative().nullable().optional(),
  courierFee: z.number().nonnegative().nullable().optional(),
};

export const createRawMaterialSchema = z.object({
  ...sharedFields,
  quantity: quantitySchema.default(0),
  reorderLevel: reorderLevelSchema.default(0),
});

export const updateRawMaterialSchema = z
  .object({
    ...sharedFields,
    quantity: quantitySchema,
    reorderLevel: reorderLevelSchema,
  })
  .partial();

export const listRawMaterialsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

export const createRawMaterialBatchSchema = z.object({
  items: z.array(createRawMaterialSchema).min(1, "At least one variant is required"),
});

export const adjustStockBatchSchema = z.object({
  adjustments: z
    .array(
      z.object({
        id: z.string().uuid(),
        delta: z.number().int().refine((value) => value !== 0, "delta must not be zero"),
      }),
    )
    .min(1, "At least one adjustment is required"),
});

export const deleteRawMaterialBatchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one id is required"),
});
