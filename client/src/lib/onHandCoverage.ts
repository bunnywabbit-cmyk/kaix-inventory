import type { FinishedGood } from '../types/api'

interface CoverageLookupItem {
  designId: string
  colorwayId: string | null
  garmentStyle: string
  color: string
}

// How much of one size line is already covered by On-Hand Stock — capped at
// what's actually requested, so 2 requested with only 1 on hand reads as a
// partial "1/2" rather than claiming the whole line is covered. Finishing a
// print run deducts exactly this many from that stock instead of treating
// them as a fresh print (see printRuns.ts's finish route, whose per-size
// lookup this mirrors) — used to flag matching lines both while building a
// run (PrintRunFormModal) and in the saved list (PrintRuns).
export function onHandCoverage(
  item: CoverageLookupItem,
  size: string,
  requested: number,
  finishedGoods: FinishedGood[],
): number {
  const match = finishedGoods.find(
    (fg) =>
      fg.designId === item.designId &&
      fg.colorwayId === item.colorwayId &&
      fg.garmentStyle === item.garmentStyle &&
      fg.color === item.color &&
      fg.size === size,
  )
  return Math.min(match?.quantityOnHand ?? 0, requested)
}
