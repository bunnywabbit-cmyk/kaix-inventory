import { z } from "zod";

// Kept separate from the create schema's `.default(0)`: chaining `.partial()`
// onto a schema with `.default()` still applies the default to an omitted
// field instead of leaving it untouched, which would silently zero out
// quantityOnHand on any PATCH that doesn't include it.
const quantityOnHandSchema = z.number().int().nonnegative();

const sharedFields = {
  designId: z.string().uuid("designId must be a valid UUID"),
  colorwayId: z.string().uuid().nullable().optional(),
  garmentStyle: z.string().trim().min(1, "garmentStyle is required"),
  color: z.string().trim().min(1, "color is required"),
  size: z.string().trim().min(1, "size is required"),
  unitPrice: z.number().nonnegative().optional(),
};

export const createFinishedGoodSchema = z.object({
  ...sharedFields,
  quantityOnHand: quantityOnHandSchema.default(0),
});

export const updateFinishedGoodSchema = z
  .object({
    ...sharedFields,
    quantityOnHand: quantityOnHandSchema,
  })
  .partial();

export const adjustStockSchema = z.object({
  delta: z.number().int().refine((value) => value !== 0, "delta must not be zero"),
  reason: z.string().trim().min(1).optional(),
  // Lets Add Stock update the price on an existing variant at the same time
  // it adds quantity, instead of requiring a separate edit afterward.
  unitPrice: z.number().nonnegative().optional(),
});
