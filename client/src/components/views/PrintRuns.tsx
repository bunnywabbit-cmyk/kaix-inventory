import { CheckCircle2, ChevronDown, Circle, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePrintRuns, useRawMaterials, useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { printRunStatusLabels, printRunStatusStyles } from '../../lib/printRunStatus'
import { sortSizes } from '../../lib/variantMatrix'
import type { PrintRun, PrintRunItem } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import Collapse from '../ui/Collapse'
import ConfirmDialog from '../ui/ConfirmDialog'
import Toast from '../ui/Toast'
import PrintRunFormModal from './PrintRunFormModal'

interface PrintRunsProps {
  searchQuery: string
}

const actionButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors dark:border-slate-700 dark:text-slate-300'

function PrintRuns({ searchQuery }: PrintRunsProps) {
  const { data: printRuns, loading, error, refetch, mutate } = usePrintRuns()
  // Finishing a run deducts blank-shirt raw materials and (for DTF designs)
  // on-hand DTF stock, but those live in separately-cached resources — this
  // component only ever fetches print runs itself, so without refetching
  // these two explicitly, Raw Materials and DTF Prints would keep showing
  // pre-deduction numbers until their own 2-minute staleTime lapses.
  const { refetch: refetchRawMaterials } = useRawMaterials()
  const { refetch: refetchDesigns } = useShirtDesigns()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingRun, setEditingRun] = useState<PrintRun | null>(null)
  const [pendingDeleteRun, setPendingDeleteRun] = useState<PrintRun | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingFinishRun, setPendingFinishRun] = useState<PrintRun | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [collapsedRunIds, setCollapsedRunIds] = useState<Set<string>>(new Set())

  const toggleCollapsed = (runId: string) => {
    setCollapsedRunIds((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const filtered = useMemo(() => {
    if (!printRuns) return []
    if (!query) return printRuns
    return printRuns.filter((run) =>
      run.items.some((item) =>
        [item.design.designName, item.garmentStyle, item.colorway?.colorwayName, item.color]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query)),
      ),
    )
  }, [printRuns, query])

  const handleFormSuccess = (message: string) => {
    setAddModalOpen(false)
    setEditingRun(null)
    refetch()
    showToast(message)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteRun) return
    setDeleting(true)
    try {
      await api.del(`/print-runs/${pendingDeleteRun.id}`)
      refetch()
      showToast('Deleted print run.')
      setPendingDeleteRun(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const setItemDone = (runId: string, itemId: string, done: boolean) => {
    mutate((prev) =>
      prev
        ? prev.map((run) =>
            run.id === runId
              ? { ...run, items: run.items.map((i) => (i.id === itemId ? { ...i, done } : i)) }
              : run,
          )
        : prev,
    )
  }

  const handleToggleDone = async (runId: string, item: PrintRunItem) => {
    const nextDone = !item.done
    setItemDone(runId, item.id, nextDone)
    try {
      await api.patch(`/print-runs/items/${item.id}`, { done: nextDone })
    } catch (err) {
      setItemDone(runId, item.id, item.done)
      showToast(err instanceof Error ? err.message : 'Could not update. Please try again.')
    }
  }

  const handleConfirmFinish = async () => {
    if (!pendingFinishRun) return
    setFinishing(true)
    try {
      await api.post(`/print-runs/${pendingFinishRun.id}/finish`)
      refetch()
      refetchRawMaterials()
      refetchDesigns()
      showToast('Finished print run — blanks and DTF stock deducted.')
      setPendingFinishRun(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not finish. Please try again.')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Print Runs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Production log — designs, colorways, and quantities per batch.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="size-4" />
          Create Print Run
        </button>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading print runs..." />
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {filtered.map((run) => {
            const totalQuantity = run.items.reduce(
              (sum, item) => sum + item.sizes.reduce((s, size) => s + size.quantity, 0),
              0,
            )
            const isPlanned = run.status === 'PLANNED'
            const isCollapsed = collapsedRunIds.has(run.id)

            return (
              <div
                key={run.id}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${printRunStatusStyles[run.status]}`}
                  >
                    {printRunStatusLabels[run.status]}
                  </span>
                  <p className="text-sm text-slate-500">
                    {run.items.length} design{run.items.length === 1 ? '' : 's'} &middot;{' '}
                    <span className="font-semibold text-slate-900 tabular-nums dark:text-white">
                      {totalQuantity}
                    </span>{' '}
                    pcs
                  </p>
                  <p className="text-xs text-slate-400">
                    {isPlanned
                      ? `created ${new Date(run.createdAt).toLocaleDateString()}`
                      : run.finishedAt && `finished ${new Date(run.finishedAt).toLocaleDateString()}`}
                  </p>

                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {isPlanned && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingRun(run)}
                          className={`${actionButtonClass} hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-slate-800`}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingFinishRun(run)}
                          className={`${actionButtonClass} hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-800`}
                        >
                          <CheckCircle2 className="size-3.5" />
                          Finish
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteRun(run)}
                          className={`${actionButtonClass} hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-slate-800`}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(run.id)}
                      aria-label={isCollapsed ? 'Expand print run' : 'Collapse print run'}
                      aria-expanded={!isCollapsed}
                      className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                <Collapse open={!isCollapsed}>
                  <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {run.items.map((item) => {
                      const imageUrl = item.colorway?.imageUrl || item.design.mainProductImage
                      const sizes = sortSizes(item.sizes.map((s) => s.size)).map(
                        (size) => item.sizes.find((s) => s.size === size)!,
                      )
                      const itemTotal = item.sizes.reduce((sum, s) => sum + s.quantity, 0)

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors ${
                            item.done ? 'bg-emerald-50/60 dark:bg-emerald-500/5' : ''
                          }`}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.design.designName}
                              className={`size-11 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800 ${
                                item.done ? 'opacity-50' : ''
                              }`}
                            />
                          ) : (
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                              <ImageOff className="size-4" />
                            </div>
                          )}

                          <div className={`w-44 shrink-0 ${item.done ? 'opacity-60' : ''}`}>
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {item.design.designName}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {[item.colorway?.colorwayName ?? item.color, item.garmentStyle].join(' · ')}
                            </p>
                          </div>

                          <div className={`flex flex-1 flex-wrap items-center gap-1.5 ${item.done ? 'opacity-60' : ''}`}>
                            {sizes.map((entry) => (
                              <span
                                key={entry.id}
                                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                              >
                                {entry.size}{' '}
                                <span className="tabular-nums text-slate-900 dark:text-white">{entry.quantity}</span>
                              </span>
                            ))}
                          </div>

                          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                            {itemTotal} pcs
                          </span>

                          {isPlanned && (
                            <button
                              type="button"
                              onClick={() => handleToggleDone(run.id, item)}
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                item.done
                                  ? 'border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600'
                                  : 'border-slate-200 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                              }`}
                            >
                              {item.done ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
                              {item.done ? 'Done' : 'Mark Done'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Collapse>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
              {searchQuery ? `No print runs match "${searchQuery}".` : 'No print runs yet.'}
            </p>
          )}
        </div>
      )}

      {addModalOpen && (
        <PrintRunFormModal onClose={() => setAddModalOpen(false)} onSuccess={handleFormSuccess} />
      )}

      {editingRun && (
        <PrintRunFormModal
          printRun={editingRun}
          onClose={() => setEditingRun(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {pendingDeleteRun && (
        <ConfirmDialog
          title="Delete this print run?"
          message="This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          confirming={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteRun(null)}
        />
      )}

      {pendingFinishRun && (
        <ConfirmDialog
          title="Finish this print run?"
          message="This deducts the printed quantities from the matching blanks in Raw Materials for every design in this run — and, for DTF designs, from their on-hand print stock too — then locks it as complete. This cannot be undone."
          confirmLabel="Finish Print Run"
          confirming={finishing}
          onConfirm={handleConfirmFinish}
          onCancel={() => setPendingFinishRun(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default PrintRuns
