import { ImageOff, Trophy } from 'lucide-react'
import type { PrintRun } from '../../types/api'

interface TopSellingDesignsProps {
  printRuns: PrintRun[]
  onViewAll: () => void
}

interface DesignTally {
  designId: string
  designName: string
  mainProductImage: string
  totalQuantity: number
}

// "Top selling" here means most-printed: summed across every print run line
// for that design, regardless of run status — a planned run still reflects
// real demand, and there's no separate sales ledger to rank against yet.
function tallyTopDesigns(printRuns: PrintRun[]): DesignTally[] {
  const totals = new Map<string, DesignTally>()
  for (const run of printRuns) {
    for (const item of run.items) {
      const itemQuantity = item.sizes.reduce((sum, size) => sum + size.quantity, 0)
      const existing = totals.get(item.designId)
      if (existing) {
        existing.totalQuantity += itemQuantity
      } else {
        totals.set(item.designId, {
          designId: item.designId,
          designName: item.design.designName,
          mainProductImage: item.design.mainProductImage,
          totalQuantity: itemQuantity,
        })
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.totalQuantity - a.totalQuantity)
}

function TopSellingDesigns({ printRuns, onViewAll }: TopSellingDesignsProps) {
  const topDesigns = tallyTopDesigns(printRuns).slice(0, 5)
  const maxQuantity = topDesigns[0]?.totalQuantity ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top Selling Designs</h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View all &rarr;
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {topDesigns.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No print runs logged yet.</p>
        )}
        {topDesigns.map((design, index) => (
          <div key={design.designId} className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {index + 1}
            </span>
            {design.mainProductImage ? (
              <img
                src={design.mainProductImage}
                alt=""
                className="size-10 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                <ImageOff className="size-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {design.designName}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${maxQuantity > 0 ? (design.totalQuantity / maxQuantity) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
              {design.totalQuantity} pcs
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopSellingDesigns
