import { ImageOff, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useScreens } from '../../hooks/useInventory'
import { formatScreenNumber } from '../../lib/screenNumber'
import { screenStatusLabels, screenStatusStyles } from '../../lib/screenStatus'
import type { PhysicalScreen } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import Toast from '../ui/Toast'
import ScreenFormModal from './ScreenFormModal'

interface ScreenRackProps {
  searchQuery: string
}

function ScreenRack({ searchQuery }: ScreenRackProps) {
  const { data: screens, loading, error, refetch } = useScreens()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingScreen, setEditingScreen] = useState<PhysicalScreen | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const handleFormSuccess = (message: string) => {
    setAddModalOpen(false)
    setEditingScreen(null)
    refetch()
    showToast(message)
  }

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
          onClick={() => setAddModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="size-4" />
          Add Screen
        </button>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading screens..." />
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
                    screen.colorways.map((colorway) => (
                      <div key={colorway.id} className="flex min-w-0 items-center gap-3">
                        {colorway.imageUrl ? (
                          <img
                            src={colorway.imageUrl}
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
                          <span className="block truncate text-xs text-slate-400">
                            {colorway.shirtDesign.designName}
                          </span>
                        </p>
                      </div>
                    ))
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
          onClose={() => setAddModalOpen(false)}
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
