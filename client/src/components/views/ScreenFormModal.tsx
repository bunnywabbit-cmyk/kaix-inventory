import { Loader2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { invalidBoxClass, invalidInputClass } from '../../lib/formValidation'
import { formatScreenNumber } from '../../lib/screenNumber'
import { screenStatusLabels } from '../../lib/screenStatus'
import type { PhysicalScreen, ScreenStatus } from '../../types/api'
import ColorwayPicker, { type ColorwayPickerDesign } from '../ui/ColorwayPicker'
import Modal from '../ui/Modal'

interface ScreenFormModalProps {
  screens: PhysicalScreen[]
  screen?: PhysicalScreen
  /** Pre-select these colorways when creating a new screen (e.g. jumping in
   * from a "needs screens" prompt elsewhere). Ignored when editing. */
  initialColorwayIds?: string[]
  onClose: () => void
  onSuccess: (message: string) => void
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const inputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`
const labelClass = 'text-xs font-medium text-slate-500'

const STATUS_OPTIONS: ScreenStatus[] = [
  'CLEAN_RECLAIMED',
  'COATED_EMULSION',
  'DEVELOPED',
  'EXPOSED_READY',
  'ON_PRESS',
  'NEEDS_RECLAIM',
]

const FRAME_TYPE_OPTIONS = ['Wood', 'Aluminum'] as const
const MESH_COUNT_OPTIONS = [80, 100, 120, 150, 180] as const
const FRAME_SIZE_OPTIONS = ['18x24 inches', '20x24 inches', '23x31 inches'] as const
const DEFAULT_FRAME_SIZE = '18x24 inches'

// Screens are numbered "Screen #001", "Screen #002", ... — the next suffix is
// one past the highest trailing digit run found among existing screens.
function nextScreenNumberSuffix(screens: PhysicalScreen[]): string {
  let max = 0
  for (const screen of screens) {
    const match = screen.screenNumber.match(/(\d+)\s*$/)
    if (match) max = Math.max(max, parseInt(match[1]!, 10))
  }
  return String(max + 1).padStart(3, '0')
}

function ScreenFormModal({
  screens,
  screen,
  initialColorwayIds,
  onClose,
  onSuccess,
}: ScreenFormModalProps) {
  const isEdit = Boolean(screen)
  const { data: designs } = useShirtDesigns()

  // Colorways are picked by first choosing a design, then its colorways. A colorway
  // can be linked to more than one screen at once (e.g. a multi-color design needs a
  // separate screen per ink color), so a colorway already linked elsewhere still stays
  // pickable here. The screen's own already-linked colorways ride along on `screen`
  // itself (from the parent's already-loaded list), so seed them in immediately —
  // otherwise the picker briefly can't resolve their names/thumbnails until the
  // separate designs fetch resolves.
  const designsForPicker = useMemo(() => {
    const list: ColorwayPickerDesign[] = (designs ?? [])
      .filter((design) => design.printType === 'SILKSCREEN')
      .map((design) => ({
        id: design.id,
        designName: design.designName,
        mainProductImage: design.mainProductImage,
        totalColorwayCount: design.colorways.length,
        colorways: design.colorways.map((colorway) => ({
          id: colorway.id,
          colorwayName: colorway.colorwayName,
          imageUrl: colorway.imageUrl,
        })),
      }))

    for (const colorway of screen?.colorways ?? []) {
      const existing = list.find((design) => design.id === colorway.shirtDesignId)
      const entry = { id: colorway.id, colorwayName: colorway.colorwayName, imageUrl: colorway.imageUrl }
      if (existing) {
        if (!existing.colorways.some((c) => c.id === colorway.id)) existing.colorways.push(entry)
      } else {
        list.push({
          id: colorway.shirtDesignId,
          designName: colorway.shirtDesign.designName,
          mainProductImage: colorway.shirtDesign.mainProductImage,
          totalColorwayCount: 1,
          colorways: [entry],
        })
      }
    }
    return list
  }, [designs, screen])

  // null = user hasn't edited the field yet, so it tracks the auto-generated
  // next number; a real string means they've taken over. `screens` comes from
  // the parent's already-loaded list, so this is ready the instant the modal opens.
  const [screenNumberDraft, setScreenNumberDraft] = useState<string | null>(
    screen ? screen.screenNumber.replace(/^Screen #/, '') : null,
  )
  const screenNumberSuffix = screenNumberDraft ?? nextScreenNumberSuffix(screens)
  const screenNumber = `Screen #${screenNumberSuffix.trim()}`

  const [meshCount, setMeshCount] = useState(screen ? String(screen.meshCount) : '')
  const [frameType, setFrameType] = useState(screen?.frameType ?? '')
  const [frameSize, setFrameSize] = useState(screen?.frameSize ?? DEFAULT_FRAME_SIZE)
  const [status, setStatus] = useState<ScreenStatus>(screen?.status ?? 'CLEAN_RECLAIMED')
  const [colorwayIds, setColorwayIds] = useState<string[]>(
    () => screen?.colorways.map((c) => c.id) ?? initialColorwayIds ?? [],
  )

  // Most of the time a "new" screen is really an already-cut, currently-blank
  // frame sitting in the rack, not a brand-new physical object — so creating
  // a screen offers reusing one of those instead of always registering a
  // fresh number. Reusing pre-fills (and locks) its real specs and, on
  // submit, PATCHes that screen rather than POSTing a new row. Edit mode
  // doesn't offer this — you wouldn't reassign an existing screen's identity
  // mid-edit.
  // "Clean" alone isn't enough — some screens carry a Clean status while
  // still holding a colorway from before it was reclaimed, which the rest of
  // the app already treats as still-in-use (see the "Unassigned" check in
  // ScreenRack). Only an actually-empty clean screen is free to hand out here.
  const cleanScreens = useMemo(
    () =>
      screens.filter(
        (candidate) => candidate.status === 'CLEAN_RECLAIMED' && candidate.colorways.length === 0,
      ),
    [screens],
  )
  const [reuseScreenId, setReuseScreenId] = useState('')
  const reusingScreen = cleanScreens.find((candidate) => candidate.id === reuseScreenId) ?? null

  const handleReuseScreenChange = (id: string) => {
    setReuseScreenId(id)
    const target = cleanScreens.find((candidate) => candidate.id === id)
    if (target) {
      setScreenNumberDraft(target.screenNumber.replace(/^Screen #/, ''))
      setMeshCount(String(target.meshCount))
      setFrameType(target.frameType)
      setFrameSize(target.frameSize ?? DEFAULT_FRAME_SIZE)
    } else {
      setScreenNumberDraft(null)
      setMeshCount('')
      setFrameType('')
      setFrameSize(DEFAULT_FRAME_SIZE)
    }
  }

  // Reclaiming a screen wipes it clean — washing out the emulsion frees up
  // whatever colorway(s) it was holding for reuse elsewhere.
  const handleStatusChange = (next: ScreenStatus) => {
    setStatus(next)
    if (next === 'CLEAN_RECLAIMED') setColorwayIds([])
  }

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  // At least one colorway must be chosen when registering a brand-new screen, but an
  // existing screen can be edited back down to "no colorway" (e.g. reclaimed).
  const canSubmit = Boolean(
    screenNumberSuffix.trim() &&
      frameType.trim() &&
      Number(meshCount) > 0 &&
      (isEdit || colorwayIds.length > 0),
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const payload = {
        screenNumber: screenNumber.trim(),
        meshCount: Number(meshCount),
        frameType: frameType.trim(),
        frameSize: frameSize.trim() || undefined,
        status,
        colorwayIds,
      }
      if (isEdit) {
        await api.patch(`/screens/${screen!.id}`, payload)
        onSuccess(`Updated ${payload.screenNumber}.`)
      } else if (reusingScreen) {
        // Only the parts that actually changed — mesh/frame specs belong to
        // the physical object we're reusing, not this form.
        await api.patch(`/screens/${reusingScreen.id}`, { status, colorwayIds })
        onSuccess(`Linked ${payload.screenNumber}.`)
      } else {
        await api.post('/screens', payload)
        onSuccess(`Added ${payload.screenNumber}.`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Screen' : 'Add Screen'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isEdit && cleanScreens.length > 0 && (
          <div>
            <label className={labelClass} htmlFor="screen-reuse">
              Screen Number
            </label>
            <select
              id="screen-reuse"
              value={reuseScreenId}
              onChange={(event) => handleReuseScreenChange(event.target.value)}
              className={`${inputClass} mt-1`}
            >
              <option value="">+ Register a new screen</option>
              {cleanScreens.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {formatScreenNumber(candidate.screenNumber)} — Mesh {candidate.meshCount}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {reusingScreen
                ? 'Reusing this clean screen — its mesh and frame specs are locked in below.'
                : 'Or pick a clean screen already in the rack instead of registering a new one.'}
            </p>
          </div>
        )}

        {reusingScreen ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {formatScreenNumber(reusingScreen.screenNumber)} · Mesh {reusingScreen.meshCount} ·{' '}
            {reusingScreen.frameType}
            {reusingScreen.frameSize ? ` · ${reusingScreen.frameSize}` : ''}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="screen-number">
                  Screen Number
                </label>
                <div
                  className={`mt-1 flex items-stretch overflow-hidden rounded-lg border bg-white dark:bg-slate-950 ${
                    attempted && !screenNumberSuffix.trim()
                      ? invalidBoxClass
                      : 'border-slate-200 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30 dark:border-slate-800'
                  }`}
                >
                  <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    #
                  </span>
                  <input
                    id="screen-number"
                    type="text"
                    required
                    value={screenNumberSuffix}
                    onChange={(event) => setScreenNumberDraft(event.target.value)}
                    placeholder="106"
                    className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 outline-none dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="screen-mesh">
                  Mesh Count
                </label>
                <input
                  id="screen-mesh"
                  type="number"
                  min={1}
                  list="screen-mesh-options"
                  required
                  value={meshCount}
                  onChange={(event) => setMeshCount(event.target.value)}
                  placeholder="e.g. 156"
                  className={attempted && !(Number(meshCount) > 0) ? inputClassInvalid : inputClass}
                />
                <datalist id="screen-mesh-options">
                  {MESH_COUNT_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="screen-frame-type">
                  Frame Type
                </label>
                <input
                  id="screen-frame-type"
                  type="text"
                  list="screen-frame-type-options"
                  required
                  value={frameType}
                  onChange={(event) => setFrameType(event.target.value)}
                  placeholder="e.g. Aluminum"
                  className={attempted && !frameType.trim() ? inputClassInvalid : inputClass}
                />
                <datalist id="screen-frame-type-options">
                  {FRAME_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass} htmlFor="screen-frame-size">
                  Frame Size <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="screen-frame-size"
                  type="text"
                  list="screen-frame-size-options"
                  value={frameSize}
                  onChange={(event) => setFrameSize(event.target.value)}
                  placeholder="e.g. 18x24 inches"
                  className={inputClass}
                />
                <datalist id="screen-frame-size-options">
                  {FRAME_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>
          </>
        )}

        <div>
          <label className={labelClass} htmlFor="screen-status">
            Status
          </label>
          <select
            id="screen-status"
            required
            value={status}
            onChange={(event) => handleStatusChange(event.target.value as ScreenStatus)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {screenStatusLabels[option]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={labelClass}>
            Colorways{isEdit ? <span className="font-normal text-slate-400"> (optional)</span> : null}
          </span>
          <div
            className={
              attempted && !isEdit && colorwayIds.length === 0
                ? 'mt-1 rounded-lg p-1 ring-1 ring-red-500'
                : 'mt-1'
            }
          >
            <ColorwayPicker
              designs={designsForPicker}
              selectedIds={colorwayIds}
              onChange={setColorwayIds}
            />
          </div>
          {designsForPicker.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              No silkscreen designs yet — add one from the Designs page first.
            </p>
          )}
          {attempted && !isEdit && colorwayIds.length === 0 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Select at least one colorway.
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            A colorway can need more than one screen (halftones), and one screen can cover
            several colorways (single-color logos).
          </p>
        </div>

        {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Screen'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ScreenFormModal
