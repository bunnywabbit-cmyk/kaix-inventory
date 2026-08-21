import { Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { useSales } from '../../hooks/useSales'
import { formatCurrency } from '../../lib/currency'
import { topDesignsByRevenue } from '../../lib/salesAggregation'

interface RevenueSnapshotPanelProps {
  onViewAll: () => void
}

const TOP_DESIGN_COUNT = 3

function RevenueSnapshotPanel({ onViewAll }: RevenueSnapshotPanelProps) {
  const { sales, loading, error } = useSales('30d')

  const totalRevenue = useMemo(
    () => sales.reduce((sum, sale) => sum + (sale.totalPrice ?? 0), 0),
    [sales],
  )
  const totalUnits = useMemo(() => sales.reduce((sum, sale) => sum + sale.quantity, 0), [sales])
  const topDesigns = useMemo(() => topDesignsByRevenue(sales, TOP_DESIGN_COUNT), [sales])
  const maxDesignRevenue = topDesigns[0]?.revenue ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue</h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View all &rarr;
        </button>
      </div>

      {loading && <p className="py-6 text-center text-sm text-slate-500">Loading revenue...</p>}
      {!loading && error && (
        <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="mt-3">
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Last 30 days &middot; {totalUnits} pc{totalUnits === 1 ? '' : 's'} sold
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {topDesigns.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">No sales in the last 30 days.</p>
            )}
            {topDesigns.map((design, index) => (
              <div key={design.key} className="flex items-center gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                    {design.designName}
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                      style={{
                        width: `${maxDesignRevenue > 0 ? (design.revenue / maxDesignRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(design.revenue)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default RevenueSnapshotPanel
