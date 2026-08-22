import { ImageOff, Plus, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFinishedGoods } from '../../hooks/useInventory'
import { cldThumb } from '../../lib/cloudinaryImage'
import { sortSizes } from '../../lib/variantMatrix'
import type { FinishedGood } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import Toast from '../ui/Toast'
import AddStockModal from './AddStockModal'
import SellStockModal from './SellStockModal'

interface OnHandStockProps {
  searchQuery: string
}

export interface SizeEntry {
  id: string
  size: string
  quantity: number
  unitPrice: number | null
}

export interface StockGroup {
  key: string
  design: FinishedGood['design']
  colorway: FinishedGood['colorway']
  garmentStyle: string
  sizes: SizeEntry[]
  totalQuantity: number
  updatedAt: string
}

const rowGridClass = 'grid grid-cols-[4rem_14rem_1fr_6rem_6rem] items-center gap-4'

// A "product" on this page is a design + colorway + fit combo — design 1's
// Oversized fit and design 1's Boxy fit are different cards even though they
// share a design, and each card's sizes are just that combo's variants.
function groupBySizes(items: FinishedGood[]): StockGroup[] {
  const groups = new Map<string, StockGroup>()
  for (const item of items) {
    const key = `${item.designId}::${item.colorwayId ?? 'none'}::${item.garmentStyle}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        design: item.design,
        colorway: item.colorway,
        garmentStyle: item.garmentStyle,
        sizes: [],
        totalQuantity: 0,
        updatedAt: item.updatedAt,
      }
      groups.set(key, group)
    }
    group.sizes.push({
      id: item.id,
      size: item.size,
      quantity: item.quantityOnHand,
      unitPrice: item.unitPrice,
    })
    group.totalQuantity += item.quantityOnHand
    if (item.updatedAt > group.updatedAt) group.updatedAt = item.updatedAt
  }

  for (const group of groups.values()) {
    group.sizes = sortSizes(group.sizes.map((s) => s.size)).map(
      (size) => group.sizes.find((s) => s.size === size)!,
    )
  }

  return [...groups.values()].sort((a, b) => a.design.designName.localeCompare(b.design.designName))
}

function OnHandStock({ searchQuery }: OnHandStockProps) {
  const { data: finishedGoods, loading, error, refetch } = useFinishedGoods()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [sellingGroup, setSellingGroup] = useState<StockGroup | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const handleAddStockSuccess = (message: string) => {
    setAddModalOpen(false)
    refetch()
    showToast(message)
  }

  const handleSellSuccess = (message: string) => {
    setSellingGroup(null)
    refetch()
    showToast(message)
  }

  const filtered = useMemo(() => {
    if (!finishedGoods) return []
    if (!query) return finishedGoods
    return finishedGoods.filter((item) =>
      [item.design.designName, item.garmentStyle, item.colorway?.colorwayName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    )
  }, [finishedGoods, query])

  // A group that's dropped to zero across every size is out of stock, not
  // "on hand" — hiding it keeps this page meaning what it says. The
  // underlying FinishedGood rows (and their unitPrice) stay put, so Add
  // Stock still finds and increments them instead of creating duplicates
  // once real stock comes back in.
  const groups = useMemo(
    () => groupBySizes(filtered).filter((group) => group.totalQuantity > 0),
    [filtered],
  )
  const totalUnits = filtered.reduce((sum, item) => sum + item.quantityOnHand, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">On-Hand Stock</h2>
          <p className="mt-1 text-sm text-slate-500">Finished, printed inventory ready to ship.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 tabular-nums dark:text-white">
              {totalUnits}
            </span>{' '}
            units shown
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="size-4" />
            Add Stock
          </button>
        </div>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading finished goods..." />
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {groups.length > 0 && (
            <div
              className={`${rowGridClass} px-4 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400`}
            >
              <span />
              <span>Product</span>
              <span>Sizes &amp; Quantity</span>
              <span className="text-right">Total</span>
              <span className="text-right">Action</span>
            </div>
          )}

          <div className="space-y-3">
            {groups.map((group) => {
              const imageUrl = group.colorway?.imageUrl || group.design.mainProductImage
              return (
                <div
                  key={group.key}
                  className={`${rowGridClass} rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60`}
                >
                  {imageUrl ? (
                    <img
                      src={cldThumb(imageUrl, 136)}
                      alt={group.design.designName}
                      className="size-16 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-800"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                      <ImageOff className="size-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {group.design.designName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[group.colorway?.colorwayName, group.garmentStyle].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {group.sizes.map((entry) => (
                      <div
                        key={entry.size}
                        className="flex min-w-12 flex-col items-center rounded-lg border border-slate-200 px-2.5 py-1 dark:border-slate-700"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {entry.size}
                        </span>
                        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                          {entry.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                      {group.totalQuantity}
                    </p>
                    <p className="text-xs text-slate-400">
                      updated {new Date(group.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <button
                      type="button"
                      onClick={() => setSellingGroup(group)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ShoppingCart className="size-3.5" />
                      Sell
                    </button>
                  </div>
                </div>
              )
            })}
            {groups.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
                {searchQuery ? `No printed stock matches "${searchQuery}".` : 'No finished goods yet.'}
              </p>
            )}
          </div>
        </div>
      )}

      {addModalOpen && (
        <AddStockModal
          finishedGoods={finishedGoods ?? []}
          onClose={() => setAddModalOpen(false)}
          onSuccess={handleAddStockSuccess}
        />
      )}

      {sellingGroup && (
        <SellStockModal
          group={sellingGroup}
          onClose={() => setSellingGroup(null)}
          onSuccess={handleSellSuccess}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default OnHandStock
