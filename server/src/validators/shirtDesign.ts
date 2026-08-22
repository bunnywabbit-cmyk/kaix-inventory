import { z } from "zod";
import { DtfPrintSize, PrintType } from "../generated/prisma/enums.js";

const colorwaySchema = z.object({
  // Present when editing an existing colorway — lets the route update it in place
  // instead of deleting and recreating it, which would silently orphan any screen
  // already linked to that colorway (screens link at the colorway level).
  id: z.string().uuid().optional(),
  colorwayName: z.string().trim().min(1, "colorwayName is required"),
  // Not `.url()`: the /uploads endpoint returns a relative path, same as mainProductImage.
  // Blank is allowed so a design can be mass-created from text details alone —
  // the client's normal add/edit form still requires a photo before it lets you
  // submit, this only relaxes the API for that bulk path.
  imageUrl: z.string().trim().optional().default(""),
  // Sheet size for DTF designs — unique per colorway, the same way a
  // silkscreen colorway links to its own screen.
  dtfPrintSize: z.nativeEnum(DtfPrintSize).nullable().optional(),
  // How many physical screens this colorway needs (silkscreen only).
  screensNeeded: z.number().int().positive().default(1),
});

// Kept separate (and undefaulted) for the same reason as rawMaterial.ts's
// quantitySchema: chaining `.partial()` onto a schema with `.default()` still
// applies the default to an omitted field on PATCH instead of leaving it untouched.
const availableFitsSchema = z.array(z.enum(["Oversized", "Boxy"]));

// Not `.url()`: the /uploads endpoint returns a relative path (e.g. "/uploads/xxx.png"),
// not an absolute URL, matching how RawMaterial's imageUrl is validated. Blank is
// allowed so a design can be mass-created from text details alone — the client's
// normal add/edit form still requires a photo before it lets you submit, this only
// relaxes the API for that bulk path. Kept separate (and undefaulted) for the same
// .partial()-plus-.default() reason as availableFitsSchema above.
const mainProductImageSchema = z.string().trim().optional();

const sharedFields = {
  designName: z.string().trim().min(1, "designName is required"),
  printType: z.nativeEnum(PrintType),
  // Default sale price per piece — pre-fills FinishedGood.unitPrice when
  // stock is added, but isn't required (not every shop prices up front).
  price: z.number().nonnegative().nullable().optional(),
  colorways: z.array(colorwaySchema).optional(),
};

export const createShirtDesignSchema = z.object({
  ...sharedFields,
  mainProductImage: mainProductImageSchema.default(""),
  availableFits: availableFitsSchema.default([]),
});

export const updateShirtDesignSchema = z
  .object({
    ...sharedFields,
    mainProductImage: mainProductImageSchema,
    availableFits: availableFitsSchema,
    // Toggled from the Designs page's Unlist/Relist action — not part of the
    // main edit form.
    active: z.boolean(),
  })
  .partial();

export const createShirtDesignBatchSchema = z.object({
  items: z.array(createShirtDesignSchema).min(1, "At least one design is required"),
});
