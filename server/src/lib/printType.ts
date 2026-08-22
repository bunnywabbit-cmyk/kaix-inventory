import type { PrintType } from "../generated/prisma/enums.js";

// A HYBRID design prints one placement DTF (front) and the other silkscreen
// (back) on the same colorway, reusing DesignColorway's existing dtfPrintSize
// and screensNeeded/screens fields for whichever placement applies — so
// "does this design use DTF/silkscreen at all" is the right question
// everywhere, not "is printType exactly DTF/SILKSCREEN".
export function usesDtf(printType: PrintType): boolean {
  return printType === "DTF" || printType === "HYBRID";
}

export function usesSilkscreen(printType: PrintType): boolean {
  return printType === "SILKSCREEN" || printType === "HYBRID";
}
