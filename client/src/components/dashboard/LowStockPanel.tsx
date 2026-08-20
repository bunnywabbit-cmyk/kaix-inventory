import { Loader2, TriangleAlert } from 'lucide-react'
import type { RawMaterial } from '../../types/api'

interface LowStockPanelProps {
  items: RawMaterial[]
  pendingIds: Set<string>
  onQuickRestock: (item: RawMaterial) => void
  onViewAll: () => void
}

function LowStockPanel({ items, pendingIds, onQuickRestock, onViewAll }: LowStockPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-red-600 dark:text-red-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Low Stock Warning Panel
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View all &rarr;
        </button>
      </div>

      <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800/80">
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            Nothing below reorder level. Nice work.
          </p>
        )}
        {items.map((item) => {
          const isPending = pendingIds.has(item.id)
          const isCritical = item.quantity <= item.reorderLevel * 0.5
          const variant = [item.brand, item.color, item.size].filter(Boolean).join(' / ')

          return (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {variant || item.category.name} &middot; {item.sku}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    isCritical
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {item.quantity} / {item.reorderLevel} {item.unit ?? ''}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onQuickRestock(item)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    isPending
                      ? 'cursor-wait bg-slate-900/60 text-white dark:bg-slate-100/60 dark:text-slate-900'
                      : 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
                  }`}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Restocking...
                    </>
                  ) : (
                    'Quick Restock'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LowStockPanel
