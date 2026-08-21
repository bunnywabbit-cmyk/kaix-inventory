import { ChevronDown, ChevronLeft, ChevronRight, ImageOff, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useScreens, useShirtDesigns } from '../../hooks/useInventory'
import { cldThumb } from '../../lib/cloudinaryImage'
import { formatScreenNumber } from '../../lib/screenNumber'
import { screenStatusLabels, screenStatusStyles } from '../../lib/screenStatus'
import type { PhysicalScreen } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import Collapse from '../ui/Collapse'
import Toast from '../ui/Toast'
import ScreenFormModal from './ScreenFormModal'

interface ScreenRackProps {
  searchQuery: string
}

// Keeps the "Needs Screens" panel from turning into an unbounded wall of
// rows once a shop has a lot of designs waiting on screens.
const NEEDS_SCREENS_PAGE_SIZE = 5

function ScreenRack({ searchQuery }: ScreenRackProps) {
  const { data: screens, loading, error, refetch } = useScreens()
  // Linking/unlinking a screen changes `colorway.screens` inside the shirt-designs
  // response too (that's what the Needs Screens panel and the Designs page's
  // screen badges read), but the two are separately cached React Query
  // resources — creating/editing a screen only invalidates the screens cache
  // by default, so without refetching this one too, both views would keep
  // showing pre-mutation data until the 2-minute staleTime lapses.
  const { data: designs, refetch: refetchDesigns } = useShirtDesigns()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingScreen, setEditingScreen] = useState<PhysicalScreen | null>(null)
  const [presetColorwayId, setPresetColorwayId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [needsScreensOpen, setNeedsScreensOpen] = useState(false)
  const [needsScreensPage, setNeedsScreensPage] = useState(0)

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const handleFormSuccess = (message: string) => {
    setAddModalOpen(false)
    setEditingScreen(null)
    setPresetColorwayId(null)
    refetch()
    refetchDesigns()
    showToast(message)
  }

  const openAddModal = (colorwayId?: string) => {
    setPresetColorwayId(colorwayId ?? null)
    setAddModalOpen(true)
  }

  // Colorways that still need more physical screens than are actually linked
  // yet — set per-colorway from the Designs page (`screensNeeded`). Only
  // silkscreen designs use screens at all.
  const colorwayShortfalls = useMemo(() => {
    if (!designs) return []
    return designs
      .filter((design) => design.printType === 'SILKSCREEN')
      .flatMap((design) =>
        design.colorways
          .filter((colorway) => colorway.screens.length < colorway.screensNeeded)
          .map((colorway) => ({
            design,
            colorway,
            linked: colorway.screens.length,
            needed: colorway.screensNeeded,
          })),
      )
  }, [designs])

  // A screen's position within its colorway's screens (e.g. "Screen 1 of 2"
  // for a 2-color separation) — keyed by colorway+screen since a screen
  // shared across colorways can hold a different position in each one.
  // Screens are pre-ordered by createdAt on the API, so position reflects
  // link order, not array order.
  const screenOrdinals = useMemo(() => {
    const map = new Map<string, { position: number; total: number }>()
    for (const design of designs ?? []) {
      for (const colorway of design.colorways) {
        if (colorway.screens.length < 2) continue
        colorway.screens.forEach((linkedScreen, index) => {
          map.set(`${colorway.id}::${linkedScreen.id}`, {
            position: index + 1,
            total: colorway.screens.length,
          })
        })
      }
    }
    return map
  }, [designs])

  // Clamp rather than reset on every change — if a screen gets linked and a
  // row drops off the current page, this settles on the new last page
  // instead of silently snapping back to page 1.
  const needsScreensTotalPages = Math.max(
    1,
    Math.ceil(colorwayShortfalls.length / NEEDS_SCREENS_PAGE_SIZE),
  )
  const needsScreensClampedPage = Math.min(needsScreensPage, needsScreensTotalPages - 1)
  const pagedShortfalls = colorwayShortfalls.slice(
    needsScreensClampedPage * NEEDS_SCREENS_PAGE_SIZE,
    needsScreensClampedPage * NEEDS_SCREENS_PAGE_SIZE + NEEDS_SCREENS_PAGE_SIZE,
  )

  const filtered = useMemo(() => {
    if (!screens) return []
    if (!query) return screens
    return screens.filter(
      (screen) =>
        screen.screenNumber.toLowerCase().includes(query) ||
        screen.colorways.some(
          (colorway) =>
            colorway.colorwayName.toLowerCase().includes(query) ||
            colorway.shirtDesign.designName.toLowerCase().includes(query),
        ),
    )
  }, [screens, query])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Screen Rack</h2>
          <p className="mt-1 text-sm text-slate-500">
            Physical screen frames and their current status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAddModal()}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="size-4" />
          Add Screen
        </button>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading screens..." />
      )}

      {!loading && !error && colorwayShortfalls.length > 0 && (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5">
          <button
            type="button"
            onClick={() => setNeedsScreensOpen((prev) => !prev)}
            aria-expanded={needsScreensOpen}
            className="flex w-full items-center justify-between gap-3 p-3 text-left"
          >
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Needs Screens
              <span className="ml-1.5 font-normal text-amber-600 dark:text-amber-400">
                ({colorwayShortfalls.length})
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-amber-600 transition-transform duration-300 dark:text-amber-400 ${
                needsScreensOpen ? '' : '-rotate-90'
              }`}
            />
          </button>
          <Collapse open={needsScreensOpen}>
            <div className="space-y-1.5 px-3 pb-3">
              {pagedShortfalls.map(({ design, colorway, linked, needed }) => (
                <div
                  key={colorway.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 dark:bg-slate-900"
                >
                  {colorway.imageUrl ? (
                    <img
                      src={cldThumb(colorway.imageUrl, 80)}
                      alt={colorway.colorwayName}
                      className="size-9 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                      <ImageOff className="size-4" />
                    </span>
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                    {colorway.colorwayName}
                    <span className="block truncate text-xs text-slate-400">
                      {design.designName}
                    </span>
                  </p>
                  <span className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {linked}/{needed} screens
                  </span>
                  <button
                    type="button"
                    onClick={() => openAddModal(colorway.id)}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Plus className="size-3.5" />
                    Add Screen
                  </button>
                </div>
              ))}
              {needsScreensTotalPages > 1 && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setNeedsScreensPage((page) => Math.max(0, page - 1))}
                    disabled={needsScreensClampedPage === 0}
                    className="flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent dark:text-amber-400 dark:hover:bg-slate-900"
                  >
                    <ChevronLeft className="size-3.5" />
                    Prev
                  </button>
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    Page {needsScreensClampedPage + 1} of {needsScreensTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setNeedsScreensPage((page) => Math.min(needsScreensTotalPages - 1, page + 1))
                    }
                    disabled={needsScreensClampedPage === needsScreensTotalPages - 1}
                    className="flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent dark:text-amber-400 dark:hover:bg-slate-900"
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </Collapse>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {filtered.map((screen) => {
            return (
              <div
                key={screen.id}
                className="grid grid-cols-[8rem_14rem_1fr_1fr_1fr_1fr_auto] items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex shrink-0 flex-col items-center gap-1 text-center">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatScreenNumber(screen.screenNumber)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${screenStatusStyles[screen.status]}`}
                  >
                    {screenStatusLabels[screen.status]}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  {screen.colorways.length === 0 ? (
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                        <ImageOff className="size-5" />
                      </span>
                      <p className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300">
                        Unassigned
                      </p>
                    </div>
                  ) : (
                    screen.colorways.map((colorway) => {
                      const ordinal = screenOrdinals.get(`${colorway.id}::${screen.id}`)
                      return (
                      <div key={colorway.id} className="flex min-w-0 items-center gap-3">
                        {colorway.imageUrl ? (
                          <img
                            src={cldThumb(colorway.imageUrl, 120)}
                            alt={colorway.colorwayName}
                            className="size-14 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-800"
                          />
                        ) : (
                          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                            <ImageOff className="size-5" />
                          </span>
                        )}
                        <p
                          className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300"
                          title={`${colorway.colorwayName} — ${colorway.shirtDesign.designName}`}
                        >
                          {colorway.colorwayName}
                          {ordinal && (
                            <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                              {ordinal.position}/{ordinal.total}
                            </span>
                          )}
                          <span className="block truncate text-xs text-slate-400">
                            {colorway.shirtDesign.designName}
                          </span>
                        </p>
                      </div>
                      )
                    })
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  Mesh
                  <br />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {screen.meshCount}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Frame
                  <br />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {screen.frameType}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Size
                  <br />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {screen.frameSize ?? '—'}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Updated
                  <br />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {new Date(screen.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingScreen(screen)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
              {searchQuery ? `No screens match "${searchQuery}".` : 'No screens yet.'}
            </p>
          )}
        </div>
      )}

      {addModalOpen && (
        <ScreenFormModal
          screens={screens ?? []}
          initialColorwayIds={presetColorwayId ? [presetColorwayId] : undefined}
          onClose={() => {
            setAddModalOpen(false)
            setPresetColorwayId(null)
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {editingScreen && (
        <ScreenFormModal
          screens={screens ?? []}
          screen={editingScreen}
          onClose={() => setEditingScreen(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default ScreenRack
