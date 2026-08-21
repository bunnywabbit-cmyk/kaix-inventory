import { CheckCircle2, Circle, ImageOff, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useDtfPrintOrders, useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import type { DtfPrintOrder } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import ConfirmDialog from '../ui/ConfirmDialog'
import Toast from '../ui/Toast'
import DtfPrintOrderFormModal from './DtfPrintOrderFormModal'
import DtfStockFormModal from './DtfStockFormModal'

interface DtfPrintsProps {
  searchQuery: string
}

function DtfPrints({ searchQuery }: DtfPrintsProps) {
  const { data: orders, loading, error, refetch, mutate } = useDtfPrintOrders()
  const { data: designs, refetch: refetchDesigns } = useShirtDesigns()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DtfPrintOrder | null>(null)
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState<DtfPrintOrder | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [addStockModalOpen, setAddStockModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // On-hand printed transfer sheets, ready to press — distinct from the
  // "still owed to the print partner" order list below. Lives on the
  // colorway itself (dtfStockQuantity), same as a print run's stock reads.
  const stockRows = useMemo(() => {
    if (!designs) return []
    return designs
      .filter((design) => design.printType === 'DTF')
      .flatMap((design) =>
        design.colorways
          .filter((colorway) => colorway.dtfStockQuantity > 0)
          .map((colorway) => ({ design, colorway })),
      )
  }, [designs])

  const filteredStockRows = useMemo(() => {
    if (!query) return stockRows
    return stockRows.filter(
      (row) =>
        row.design.designName.toLowerCase().includes(query) ||
        row.colorway.colorwayName.toLowerCase().includes(query),
    )
  }, [stockRows, query])

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const handleStockFormSuccess = (message: string) => {
    setAddStockModalOpen(false)
    refetchDesigns()
    showToast(message)
  }

  const filtered = useMemo(() => {
    if (!orders) return []
    if (!query) return orders
    return orders.filter(
      (order) =>
        order.colorway.shirtDesign.designName.toLowerCase().includes(query) ||
        order.colorway.colorwayName.toLowerCase().includes(query),
    )
  }, [orders, query])

  const handleFormSuccess = (message: string) => {
    setAddModalOpen(false)
    setEditingOrder(null)
    refetch()
    showToast(message)
  }

  const setOrdered = (id: string, ordered: boolean) => {
    mutate((prev) => (prev ? prev.map((o) => (o.id === id ? { ...o, ordered } : o)) : prev))
  }

  const handleToggleOrdered = async (order: DtfPrintOrder) => {
    const nextOrdered = !order.ordered
    setOrdered(order.id, nextOrdered)
    try {
      await api.patch(`/dtf-print-orders/${order.id}`, { ordered: nextOrdered })
    } catch (err) {
      setOrdered(order.id, order.ordered)
      showToast(err instanceof Error ? err.message : 'Could not update. Please try again.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteOrder) return
    setDeleting(true)
    try {
      await api.del(`/dtf-print-orders/${pendingDeleteOrder.id}`)
      refetch()
      showToast(`Deleted DTF order for ${pendingDeleteOrder.colorway.shirtDesign.designName}.`)
      setPendingDeleteOrder(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">DTF Prints</h2>
        <p className="mt-1 text-sm text-slate-500">
          Printed transfer sheets on hand, and print files still owed to the outsourced partner.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">On-Hand Stock</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Already-printed sheets ready to press. Finishing a print run deducts from this.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddStockModalOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="size-4" />
            Add Stock
          </button>
        </div>

        <div className="space-y-2">
          {filteredStockRows.map(({ design, colorway }) => (
            <div
              key={colorway.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60"
            >
              {colorway.imageUrl ? (
                <img
                  src={colorway.imageUrl}
                  alt={design.designName}
                  className="size-11 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
                />
              ) : (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                  <Layers className="size-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {design.designName}
                </p>
                <p className="truncate text-xs text-slate-500">{colorway.colorwayName}</p>
              </div>
              {colorway.dtfPrintSize && (
                <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                  {dtfPrintSizeLabels[colorway.dtfPrintSize]}
                </span>
              )}
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 tabular-nums dark:bg-emerald-500/10 dark:text-emerald-400">
                {colorway.dtfStockQuantity} on hand
              </span>
            </div>
          ))}
          {filteredStockRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
              {query ? `No stock matches "${searchQuery}".` : 'No DTF stock on hand yet.'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">To Order</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Print files still owed to the outsourced DTF partner &mdash; mark each one Ordered
              once you've sent it over.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="size-4" />
            Add to Order List
          </button>
        </div>

        {(loading || error) && (
          <AsyncState loading={loading} error={error} loadingLabel="Loading DTF orders..." />
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {filtered.map((order) => (
            <div
              key={order.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 ${
                order.ordered ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''
              }`}
            >
              {order.colorway.imageUrl ? (
                <img
                  src={order.colorway.imageUrl}
                  alt={order.colorway.shirtDesign.designName}
                  className={`size-14 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800 ${
                    order.ordered ? 'opacity-50' : ''
                  }`}
                />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                  <ImageOff className="size-5" />
                </div>
              )}

              <div className={`min-w-0 flex-1 ${order.ordered ? 'opacity-60' : ''}`}>
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {order.colorway.shirtDesign.designName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {order.colorway.colorwayName} &middot; added{' '}
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              {order.colorway.dtfPrintSize && (
                <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
                  {dtfPrintSizeLabels[order.colorway.dtfPrintSize]}
                </span>
              )}
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300">
                Qty {order.quantity}
              </span>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleOrdered(order)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    order.ordered
                      ? 'border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {order.ordered ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                  {order.ordered ? 'Ordered' : 'Mark Ordered'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOrder(order)}
                  aria-label={`Edit ${order.colorway.shirtDesign.designName}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteOrder(order)}
                  aria-label={`Delete ${order.colorway.shirtDesign.designName}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
              {searchQuery ? `No DTF orders match "${searchQuery}".` : 'No DTF orders yet.'}
            </p>
          )}
        </div>
        )}
      </div>

      {addStockModalOpen && (
        <DtfStockFormModal onClose={() => setAddStockModalOpen(false)} onSuccess={handleStockFormSuccess} />
      )}

      {addModalOpen && (
        <DtfPrintOrderFormModal onClose={() => setAddModalOpen(false)} onSuccess={handleFormSuccess} />
      )}

      {editingOrder && (
        <DtfPrintOrderFormModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {pendingDeleteOrder && (
        <ConfirmDialog
          title={`Delete DTF order for "${pendingDeleteOrder.colorway.shirtDesign.designName}"?`}
          message="This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          confirming={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteOrder(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default DtfPrints
