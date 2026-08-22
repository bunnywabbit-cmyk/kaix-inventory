import { ChevronLeft, ChevronRight, Eye, EyeOff, Frame, ImageOff, Pencil, Plus, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { cldThumb } from '../../lib/cloudinaryImage'
import { dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import { printTypeLabels, printTypeStyles, usesDtf, usesSilkscreen } from '../../lib/printType'
import { formatScreenNumber } from '../../lib/screenNumber'
import { screenStatusLabels, screenStatusStyles } from '../../lib/screenStatus'
import type { ShirtDesign } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import Toast from '../ui/Toast'
import DesignFormModal from './DesignFormModal'

interface DesignsProps {
  searchQuery: string
}

// Keeps a full design catalog from turning into one long scroll once a shop
// has entered all of its existing designs.
const DESIGNS_PAGE_SIZE = 10

// The screens-per-colorway summary — shared between the mobile card and the
// desktop row, since the content (icon, colorway name, screen pills,
// shortfall note) is identical between them and only the surrounding layout
// differs.
function DesignScreensSummary({ design }: { design: ShirtDesign }) {
  return (
    <div className="flex items-start gap-1.5">
      <Frame className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
      {design.colorways.length === 0 ? (
        <span className="text-xs text-slate-400">No colorways yet</span>
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
          {design.colorways.map((colorway) => (
            <div key={colorway.id} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">{colorway.colorwayName}</span>
              {colorway.screens.map((screen) => (
                <span
                  key={screen.id}
                  title={screenStatusLabels[screen.status]}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${screenStatusStyles[screen.status]}`}
                >
                  {formatScreenNumber(screen.screenNumber)}
                </span>
              ))}
              {colorway.screens.length < colorway.screensNeeded && (
                <span
                  className={`text-xs ${
                    colorway.screens.length === 0
                      ? 'text-slate-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {colorway.screens.length === 0
                    ? 'Unassigned'
                    : `${colorway.screens.length}/${colorway.screensNeeded} screens`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// The DTF print-size-per-colorway summary — same sharing rationale as
// DesignScreensSummary above.
function DesignDtfSummary({ design }: { design: ShirtDesign }) {
  return (
    <div className="flex items-start gap-1.5">
      <Send className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
      {design.colorways.length === 0 ? (
        <span className="text-xs text-slate-400">No colorways yet</span>
      ) : (
        <div className="flex min-w-0 flex-col gap-1">
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
  )
}

function Designs({ searchQuery }: DesignsProps) {
  const { data: designs, loading, error, refetch, mutate } = useShirtDesigns()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingDesign, setEditingDesign] = useState<ShirtDesign | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!designs) return []
    if (!query) return designs
    return designs.filter((design) => design.designName.toLowerCase().includes(query))
  }, [designs, query])

  // Clamp rather than reset on every change — deleting a design or filtering
  // down below the current page settles on the new last page instead of
  // silently snapping back to page 1.
  const totalPages = Math.max(1, Math.ceil(filtered.length / DESIGNS_PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const pagedDesigns = filtered.slice(
    clampedPage * DESIGNS_PAGE_SIZE,
    clampedPage * DESIGNS_PAGE_SIZE + DESIGNS_PAGE_SIZE,
  )

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

  const setActive = (id: string, active: boolean) => {
    mutate((prev) => (prev ? prev.map((d) => (d.id === id ? { ...d, active } : d)) : prev))
  }

  const handleToggleActive = async (design: ShirtDesign) => {
    const nextActive = !design.active
    setActive(design.id, nextActive)
    try {
      await api.patch(`/shirt-designs/${design.id}`, { active: nextActive })
      showToast(nextActive ? `Relisted ${design.designName}.` : `Unlisted ${design.designName}.`)
    } catch (err) {
      setActive(design.id, design.active)
      showToast(err instanceof Error ? err.message : 'Could not update. Please try again.')
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
          aria-label="Add Design"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Design</span>
        </button>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading designs..." />
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {pagedDesigns.map((design) => {
            const editButton = (
              <button
                type="button"
                onClick={() => setEditingDesign(design)}
                aria-label={`Edit ${design.designName}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )
            const toggleActiveButton = (
              <button
                type="button"
                onClick={() => handleToggleActive(design)}
                aria-label={`${design.active ? 'Unlist' : 'Relist'} ${design.designName}`}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  design.active
                    ? 'border-slate-200 text-slate-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    : 'border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {design.active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span className="hidden sm:inline">{design.active ? 'Unlist' : 'Relist'}</span>
              </button>
            )

            return (
              <div key={design.id}>
                {/* Mobile: image + name on the left, print-type/unlisted
                    badges stacked on the right of the same row, screens/DTF
                    details and actions below. */}
                <div
                  className={`rounded-xl border border-slate-200 bg-white p-3 transition-colors dark:border-slate-800 dark:bg-slate-900/60 sm:hidden ${
                    design.active ? '' : 'bg-slate-50/60 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex min-w-0 items-center gap-3 ${design.active ? '' : 'opacity-60'}`}>
                      {design.mainProductImage ? (
                        <img
                          src={cldThumb(design.mainProductImage, 96)}
                          alt={design.designName}
                          className={`size-14 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800 ${
                            design.active ? '' : 'opacity-50'
                          }`}
                        />
                      ) : (
                        <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                          <ImageOff className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {design.designName}
                        </p>
                        {design.availableFits.length > 0 && (
                          <p className="truncate text-xs text-slate-500">
                            {design.availableFits.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${printTypeStyles[design.printType]}`}
                      >
                        {printTypeLabels[design.printType]}
                      </span>
                      {!design.active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                          Unlisted
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <div className={`min-w-0 flex-1 space-y-2 ${design.active ? '' : 'opacity-60'}`}>
                      {usesSilkscreen(design.printType) && <DesignScreensSummary design={design} />}
                      {usesDtf(design.printType) && <DesignDtfSummary design={design} />}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {editButton}
                      {toggleActiveButton}
                    </div>
                  </div>
                </div>

                {/* Desktop / tablet: unchanged wrapping row. */}
                <div
                  className={`hidden flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 sm:flex ${
                    design.active ? '' : 'bg-slate-50/60 dark:bg-slate-950/40'
                  }`}
                >
                  {design.mainProductImage ? (
                    <img
                      src={cldThumb(design.mainProductImage, 96)}
                      alt={design.designName}
                      className={`size-11 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800 ${
                        design.active ? '' : 'opacity-50'
                      }`}
                    />
                  ) : (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                      <ImageOff className="size-4" />
                    </div>
                  )}

                  <div className={`min-w-0 flex-1 ${design.active ? '' : 'opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100">
                        {design.designName}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${printTypeStyles[design.printType]}`}
                      >
                        {printTypeLabels[design.printType]}
                      </span>
                      {!design.active && (
                        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                          Unlisted
                        </span>
                      )}
                    </div>
                    {design.availableFits.length > 0 && (
                      <p className="truncate text-xs text-slate-500">
                        {design.availableFits.join(' · ')}
                      </p>
                    )}
                  </div>

                  {usesSilkscreen(design.printType) && <DesignScreensSummary design={design} />}
                  {usesDtf(design.printType) && <DesignDtfSummary design={design} />}

                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    {editButton}
                    {toggleActiveButton}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
              {searchQuery ? `No designs match "${searchQuery}".` : 'No designs yet.'}
            </p>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={clampedPage === 0}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {clampedPage + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={clampedPage === totalPages - 1}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>
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

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default Designs
