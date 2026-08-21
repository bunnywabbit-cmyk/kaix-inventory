import { CheckCircle2, ImageOff, Loader2, Send } from 'lucide-react'
import { cldThumb } from '../../lib/cloudinaryImage'
import { dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import type { DtfPrintOrder } from '../../types/api'

interface DtfOrdersPanelProps {
  items: DtfPrintOrder[]
  pendingIds: Set<string>
  onQuickMarkOrdered: (order: DtfPrintOrder) => void
  onViewAll: () => void
}

function DtfOrdersPanel({ items, pendingIds, onQuickMarkOrdered, onViewAll }: DtfOrdersPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="size-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            DTF Print Files To Order
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
            Nothing waiting to be ordered. Nice work.
          </p>
        )}
        {items.map((order) => {
          const isPending = pendingIds.has(order.id)
          return (
            <div key={order.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {order.colorway.imageUrl ? (
                  <img
                    src={cldThumb(order.colorway.imageUrl, 80)}
                    alt=""
                    className="size-9 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                    <ImageOff className="size-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {order.colorway.shirtDesign.designName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {order.colorway.colorwayName}
                    {order.colorway.dtfPrintSize &&
                      ` · ${dtfPrintSizeLabels[order.colorway.dtfPrintSize]}`}{' '}
                    &middot; qty {order.quantity}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onQuickMarkOrdered(order)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  isPending
                    ? 'cursor-wait bg-slate-900/60 text-white dark:bg-slate-100/60 dark:text-slate-900'
                    : 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Mark Ordered
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DtfOrdersPanel
