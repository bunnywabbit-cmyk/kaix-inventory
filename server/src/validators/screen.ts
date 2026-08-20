import { z } from "zod";
import { ScreenStatus } from "../generated/prisma/enums.js";

// Kept separate (and undefaulted on colorwayIds) for the same reason as elsewhere in
// this codebase: chaining `.partial()` onto a schema with a `.min()`-constrained array
// would otherwise still require a non-empty array be present as a key when touched.
const sharedFields = {
  screenNumber: z.string().trim().min(1, "screenNumber is required"),
  meshCount: z.number().int().positive(),
  frameType: z.string().trim().min(1, "frameType is required"),
  frameSize: z.string().trim().min(1).optional(),
  status: z.nativeEnum(ScreenStatus).optional(),
};

export const createScreenSchema = z.object({
  ...sharedFields,
  colorwayIds: z.array(z.string().uuid()).min(1, "At least one colorway is required"),
});

export const updateScreenSchema = z
  .object({
    ...sharedFields,
    colorwayIds: z.array(z.string().uuid()),
  })
  .partial();
