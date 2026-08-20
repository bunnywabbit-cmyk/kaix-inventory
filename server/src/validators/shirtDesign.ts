import { z } from "zod";
import { DtfPrintSize, PrintType } from "../generated/prisma/enums.js";

const colorwaySchema = z.object({
  // Present when editing an existing colorway — lets the route update it in place
  // instead of deleting and recreating it, which would silently orphan any screen
  // already linked to that colorway (screens link at the colorway level).
  id: z.string().uuid().optional(),
  colorwayName: z.string().trim().min(1, "colorwayName is required"),
  // Not `.url()`: the /uploads endpoint returns a relative path, same as mainProductImage.
  imageUrl: z.string().trim().min(1, "imageUrl is required"),
  // Sheet size for DTF designs — unique per colorway, the same way a
  // silkscreen colorway links to its own screen.
  dtfPrintSize: z.nativeEnum(DtfPrintSize).nullable().optional(),
});

// Kept separate (and undefaulted) for the same reason as rawMaterial.ts's
// quantitySchema: chaining `.partial()` onto a schema with `.default()` still
// applies the default to an omitted field on PATCH instead of leaving it untouched.
const availableFitsSchema = z.array(z.enum(["Oversized", "Boxy"]));

const sharedFields = {
  designName: z.string().trim().min(1, "designName is required"),
  printType: z.nativeEnum(PrintType),
  // Not `.url()`: the /uploads endpoint returns a relative path (e.g. "/uploads/xxx.png"),
  // not an absolute URL, matching how RawMaterial's imageUrl is validated.
  mainProductImage: z.string().trim().min(1, "mainProductImage is required"),
  // Default sale price per piece — pre-fills FinishedGood.unitPrice when
  // stock is added, but isn't required (not every shop prices up front).
  price: z.number().nonnegative().nullable().optional(),
  colorways: z.array(colorwaySchema).optional(),
};

export const createShirtDesignSchema = z.object({
  ...sharedFields,
  availableFits: availableFitsSchema.default([]),
});

export const updateShirtDesignSchema = z
  .object({
    ...sharedFields,
    availableFits: availableFitsSchema,
  })
  .partial();
