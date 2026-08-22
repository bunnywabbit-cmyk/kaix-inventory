import type { PrintType } from '../types/api'

export const printTypeLabels: Record<PrintType, string> = {
  SILKSCREEN: 'Silkscreen',
  DTF: 'DTF',
  HYBRID: 'Hybrid',
}

export const printTypeStyles: Record<PrintType, string> = {
  SILKSCREEN:
    'bg-violet-100 text-violet-700 ring-violet-400/60 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/30',
  DTF: 'bg-sky-100 text-sky-700 ring-sky-400/60 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30',
  HYBRID:
    'bg-amber-100 text-amber-700 ring-amber-400/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
}

// A HYBRID design prints one placement DTF (front) and the other silkscreen
// (back) on the same colorway, reusing DesignColorway's existing
// dtfPrintSize and screensNeeded/screens fields for whichever placement
// applies — so "does this design use DTF/silkscreen at all" is the right
// question everywhere, not "is printType exactly DTF/SILKSCREEN".
export function usesDtf(printType: PrintType): boolean {
  return printType === 'DTF' || printType === 'HYBRID'
}

export function usesSilkscreen(printType: PrintType): boolean {
  return printType === 'SILKSCREEN' || printType === 'HYBRID'
}
