import { Frame, ImageOff, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import { printTypeLabels, printTypeStyles } from '../../lib/printType'
import { formatScreenNumber } from '../../lib/screenNumber'
import { screenStatusLabels, screenStatusStyles } from '../../lib/screenStatus'
import type { ShirtDesign } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import ConfirmDialog from '../ui/ConfirmDialog'
import Toast from '../ui/Toast'
import DesignFormModal from './DesignFormModal'

interface DesignsProps {
  searchQuery: string
}

function Designs({ searchQuery }: DesignsProps) {
  const { data: designs, loading, error, refetch } = useShirtDesigns()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingDesign, setEditingDesign] = useState<ShirtDesign | null>(null)
  const [pendingDeleteDesign, setPendingDeleteDesign] = useState<ShirtDesign | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!designs) return []
    if (!query) return designs
    return designs.filter((design) => design.designName.toLowerCase().includes(query))
  }, [designs, query])

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const handleFormSuccess = (message: string) => {
    setAddModalOpen(false)
    setEditingDesign(null)
    refetch()
    showToast(message)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteDesign) return
    setDeleting(true)
    try {
      await api.del(`/shirt-designs/${pendingDeleteDesign.id}`)
      refetch()
      showToast(`Deleted ${pendingDeleteDesign.designName}.`)
      setPendingDeleteDesign(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Designs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Shirt designs available for pre-order, DTF or silkscreen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="size-4" />
          Add Design
        </button>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading designs..." />
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {filtered.map((design) => (
            <div
              key={design.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              {design.mainProductImage ? (
                <img
                  src={design.mainProductImage}
                  alt={design.designName}
                  className="size-11 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
                />
              ) : (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                  <ImageOff className="size-4" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100">
                    {design.designName}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${printTypeStyles[design.printType]}`}
                  >
                    {printTypeLabels[design.printType]}
                  </span>
                </div>
                {design.availableFits.length > 0 && (
                  <p className="truncate text-xs text-slate-500">
                    {design.availableFits.join(' · ')}
                  </p>
                )}
              </div>

              {design.printType === 'SILKSCREEN' && (
                <div className="flex items-start gap-1.5">
                  <Frame className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  {design.colorways.length === 0 ? (
                    <span className="text-xs text-slate-400">No colorways yet</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {design.colorways.map((colorway) => (
                        <div key={colorway.id} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">{colorway.colorwayName}</span>
                          {colorway.screens.length === 0 ? (
                            <span className="text-xs text-slate-400">No screen</span>
                          ) : (
                            colorway.screens.map((screen) => (
                              <span
                                key={screen.id}
                                title={screenStatusLabels[screen.status]}
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${screenStatusStyles[screen.status]}`}
                              >
                                {formatScreenNumber(screen.screenNumber)}
                              </span>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {design.printType === 'DTF' && (
                <div className="flex items-start gap-1.5">
                  <Send className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  {design.colorways.length === 0 ? (
                    <span className="text-xs text-slate-400">No colorways yet</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {design.colorways.map((colorway) => (
                        <div key={colorway.id} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">{colorway.colorwayName}</span>
                          {colorway.dtfPrintSize ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-400/60 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30">
                              {dtfPrintSizeLabels[colorway.dtfPrintSize]}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No print size yet</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDesign(design)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteDesign(design)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
              {searchQuery ? `No designs match "${searchQuery}".` : 'No designs yet.'}
            </p>
          )}
        </div>
      )}

      {addModalOpen && (
        <DesignFormModal onClose={() => setAddModalOpen(false)} onSuccess={handleFormSuccess} />
      )}

      {editingDesign && (
        <DesignFormModal
          design={editingDesign}
          onClose={() => setEditingDesign(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {pendingDeleteDesign && (
        <ConfirmDialog
          title={`Delete "${pendingDeleteDesign.designName}"?`}
          message="This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          confirming={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteDesign(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default Designs
