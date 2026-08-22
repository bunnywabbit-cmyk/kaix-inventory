import { ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useMaterialPhoto } from '../../hooks/useMaterialPhoto'
import { api } from '../../lib/api'
import { cldThumb } from '../../lib/cloudinaryImage'
import { DTF_PRINT_SIZE_OPTIONS, dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import { invalidBoxClass, invalidInputClass } from '../../lib/formValidation'
import { usesDtf, usesSilkscreen } from '../../lib/printType'
import { FIT_STYLE_OPTIONS, type FitStyle } from '../../lib/skuGenerator'
import type { DtfPrintSize, PrintType, ShirtDesign } from '../../types/api'
import MaterialPhotoField from '../ui/MaterialPhotoField'
import Modal from '../ui/Modal'
import PriceInput from '../ui/PriceInput'
import QuantityInput from '../ui/QuantityInput'

interface DesignFormModalProps {
  design?: ShirtDesign
  existingDesigns: ShirtDesign[]
  onClose: () => void
  onSuccess: (message: string) => void
}

interface ColorwayDraft {
  key: string
  /** The server-assigned colorway id, when editing an existing one — lets the
   * server update it in place instead of deleting and recreating it, which
   * would silently orphan any screen already linked to that colorway. */
  existingId: string | null
  colorwayName: string
  file: File | null
  imageUrl: string | null
  previewSrc: string | null
  // Sheet size for DTF designs — unique per colorway, the same way a
  // silkscreen colorway links to its own screen.
  dtfPrintSize: DtfPrintSize | null
  // How many physical screens this colorway needs (silkscreen only) — e.g. a
  // 2-color ink separation needs 2 screens. Screen Rack uses this as the
  // target when showing how many are actually linked yet.
  screensNeeded: number
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
// Same box, red border/focus instead — never combined with `inputClass` in the
// same className (both set border-color, so mixing them is unreliable).
const inputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`
const labelClass = 'text-xs font-medium text-slate-500'
const pillClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? 'border-sky-500 bg-sky-500 text-white'
      : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  }`
// Shared column layout for the colorway header and every colorway row below it,
// so their cells line up. DTF designs get one extra column (Size); Hybrid gets
// both the Size and Screens columns since one colorway carries both placements.
// Every track besides Color is a fixed width — the header and each row are
// separate grid containers, so a content-sized (`auto`) track resolves to a
// different width in each one and the columns drift out of alignment. Color is
// the one `1fr` track: with no `auto` track alongside it, its share of space
// depends only on the (identical) container width, not on content, so it
// still lines up — and it lets the name input fill the row instead of leaving
// dead space.
const colorwayGridClass = (printType: PrintType) => {
  if (printType === 'HYBRID') return 'grid grid-cols-[3rem_1fr_8rem_7rem_2rem] items-center gap-3'
  if (printType === 'DTF') return 'grid grid-cols-[3rem_1fr_8rem_2rem] items-center gap-3'
  return 'grid grid-cols-[3rem_1fr_7rem_2rem] items-center gap-3'
}

function makeColorwayKey() {
  return Math.random().toString(36).slice(2)
}

function blankColorwayDraft(): ColorwayDraft {
  return {
    key: makeColorwayKey(),
    existingId: null,
    colorwayName: '',
    file: null,
    imageUrl: null,
    previewSrc: null,
    dtfPrintSize: null,
    screensNeeded: 1,
  }
}

interface ColorwayRowProps {
  draft: ColorwayDraft
  printType: PrintType
  attempted: boolean
  onNameChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onRemovePhoto: () => void
  onRemoveRow: () => void
  onDtfSizeChange: (size: DtfPrintSize) => void
  onScreensNeededChange: (count: number) => void
}

function ColorwayRow({
  draft,
  printType,
  attempted,
  onNameChange,
  onFileChange,
  onRemovePhoto,
  onRemoveRow,
  onDtfSizeChange,
  onScreensNeededChange,
}: ColorwayRowProps) {
  const inputId = useId()

  const nameInvalid = attempted && !draft.colorwayName.trim()
  const photoInvalid = attempted && !draft.file && !draft.imageUrl
  const dtfSizeInvalid = attempted && usesDtf(printType) && !draft.dtfPrintSize

  return (
    <div
      className={`${colorwayGridClass(printType)} rounded-lg border border-slate-200 p-2.5 dark:border-slate-800`}
    >
      {draft.previewSrc ? (
        <div className="relative">
          <img
            src={cldThumb(draft.previewSrc, 104) ?? undefined}
            alt="Colorway preview"
            className="size-12 rounded-md border border-slate-200 object-cover dark:border-slate-800"
          />
          <button
            type="button"
            onClick={onRemovePhoto}
            aria-label="Remove colorway photo"
            className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex size-12 cursor-pointer items-center justify-center rounded-md border border-dashed text-slate-400 hover:border-sky-400 hover:text-sky-500 dark:text-slate-600 ${
            photoInvalid ? invalidBoxClass : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <ImagePlus className="size-4" />
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(event) => {
          onFileChange(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
        className="hidden"
      />

      <input
        type="text"
        value={draft.colorwayName}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="e.g. Black Shirt / White Ink"
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${
          nameInvalid
            ? invalidInputClass
            : 'border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800'
        }`}
      />

      {usesDtf(printType) && (
        <div
          className={`flex flex-wrap justify-center gap-1.5 rounded-lg ${dtfSizeInvalid ? 'p-1 ring-1 ring-red-500' : ''}`}
        >
          {DTF_PRINT_SIZE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onDtfSizeChange(option)}
              aria-pressed={draft.dtfPrintSize === option}
              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors ${
                draft.dtfPrintSize === option
                  ? 'border-sky-500 bg-sky-500 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {dtfPrintSizeLabels[option]}
            </button>
          ))}
        </div>
      )}

      {usesSilkscreen(printType) && (
        <QuantityInput
          min={1}
          value={String(draft.screensNeeded)}
          onChange={(value) => onScreensNeededChange(Math.max(1, Number(value) || 1))}
          ariaLabel={`Screens needed for ${draft.colorwayName || 'this colorway'}`}
          dense
          className="justify-self-center"
        />
      )}

      <button
        type="button"
        onClick={onRemoveRow}
        aria-label="Remove colorway"
        className="justify-self-center rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function DesignFormModal({ design, existingDesigns, onClose, onSuccess }: DesignFormModalProps) {
  const isEdit = Boolean(design)

  const [designName, setDesignName] = useState(design?.designName ?? '')
  // Checked live (not gated behind `attempted`) so the same "taken" feedback a
  // username field gives shows up as soon as it's true, not just on submit.
  const isDuplicateName = existingDesigns.some(
    (other) =>
      other.id !== design?.id &&
      other.designName.trim().toLowerCase() === designName.trim().toLowerCase(),
  )
  const [printType, setPrintType] = useState<PrintType>(design?.printType ?? 'SILKSCREEN')
  const [price, setPrice] = useState(design?.price != null ? String(design.price) : '')
  const [availableFits, setAvailableFits] = useState<FitStyle[]>(
    (design?.availableFits as FitStyle[] | undefined) ?? [],
  )

  const toggleFit = (fit: FitStyle) => {
    setAvailableFits((prev) =>
      prev.includes(fit) ? prev.filter((item) => item !== fit) : [...prev, fit],
    )
  }

  const photo = useMaterialPhoto(design?.mainProductImage ?? null)

  const [colorways, setColorways] = useState<ColorwayDraft[]>(() => {
    if (design) {
      return design.colorways.map((colorway) => ({
        key: colorway.id,
        existingId: colorway.id,
        colorwayName: colorway.colorwayName,
        file: null,
        imageUrl: colorway.imageUrl,
        previewSrc: colorway.imageUrl,
        dtfPrintSize: colorway.dtfPrintSize,
        screensNeeded: colorway.screensNeeded,
      }))
    }
    // At least one colorway is required, so a new design starts with a blank
    // row already visible instead of hiding the requirement behind a button.
    return [blankColorwayDraft()]
  })

  const addColorwayRow = () => {
    setColorways((prev) => [...prev, blankColorwayDraft()])
  }

  const updateColorwayName = (key: string, value: string) => {
    setColorways((prev) => prev.map((c) => (c.key === key ? { ...c, colorwayName: value } : c)))
  }

  const updateColorwayFile = (key: string, file: File | null) => {
    setColorways((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c
        if (!file) return { ...c, file: null, previewSrc: c.imageUrl }
        return { ...c, file, previewSrc: URL.createObjectURL(file) }
      }),
    )
  }

  const removeColorwayPhoto = (key: string) => {
    setColorways((prev) =>
      prev.map((c) => (c.key === key ? { ...c, file: null, imageUrl: null, previewSrc: null } : c)),
    )
  }

  const removeColorwayRow = (key: string) => {
    setColorways((prev) => prev.filter((c) => c.key !== key))
  }

  const updateColorwayDtfSize = (key: string, size: DtfPrintSize) => {
    setColorways((prev) => prev.map((c) => (c.key === key ? { ...c, dtfPrintSize: size } : c)))
  }

  const updateColorwayScreensNeeded = (key: string, count: number) => {
    setColorways((prev) => prev.map((c) => (c.key === key ? { ...c, screensNeeded: count } : c)))
  }

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // Flips true on the first submit click that finds something missing — that's
  // what turns on the red highlighting, rather than disabling the button.
  const [attempted, setAttempted] = useState(false)

  interface ColorwayPayload {
    id?: string
    colorwayName: string
    imageUrl: string
    dtfPrintSize: DtfPrintSize | null
    screensNeeded: number
  }

  // Every colorway row on screen must be fully filled in before saving — an
  // incomplete or leftover blank row is no longer silently dropped, it has
  // to be finished or removed with its own X button.
  const isColorwayComplete = (draft: ColorwayDraft) => {
    const hasName = draft.colorwayName.trim().length > 0
    const hasPhoto = Boolean(draft.file || draft.imageUrl)
    if (!hasName || !hasPhoto) return false
    if (usesDtf(printType) && !draft.dtfPrintSize) return false
    return true
  }

  const resolveColorways = async (): Promise<ColorwayPayload[]> => {
    if (colorways.length === 0) {
      throw new Error('At least one colorway is required.')
    }
    const resolved: ColorwayPayload[] = []
    for (const draft of colorways) {
      if (!isColorwayComplete(draft)) {
        throw new Error(
          usesDtf(printType)
            ? 'Each colorway needs a name, a photo, and a print size.'
            : 'Each colorway needs both a name and a photo.',
        )
      }
      const imageUrl = draft.file ? (await api.upload('/uploads', draft.file)).url : draft.imageUrl!
      resolved.push({
        id: draft.existingId ?? undefined,
        colorwayName: draft.colorwayName.trim(),
        imageUrl,
        dtfPrintSize: usesDtf(printType) ? draft.dtfPrintSize : null,
        screensNeeded: usesSilkscreen(printType) ? draft.screensNeeded : 1,
      })
    }
    return resolved
  }

  const canSubmit = Boolean(
    designName.trim() &&
      !isDuplicateName &&
      photo.previewSrc &&
      availableFits.length > 0 &&
      colorways.length > 0 &&
      colorways.every(isColorwayComplete),
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setAttempted(true)
      setFormError(
        isDuplicateName
          ? 'A design with this name already exists.'
          : 'Fill in the highlighted fields before saving.',
      )
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const mainProductImage = await photo.resolveImageUrl()
      if (!mainProductImage) {
        setFormError('A product photo is required.')
        setSubmitting(false)
        return
      }

      if (availableFits.length === 0) {
        setFormError('Select at least one fit.')
        setSubmitting(false)
        return
      }

      let colorwaysPayload: ColorwayPayload[]
      try {
        colorwaysPayload = await resolveColorways()
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Invalid colorway.')
        setSubmitting(false)
        return
      }

      const payload = {
        designName: designName.trim(),
        printType,
        mainProductImage,
        availableFits,
        price: price.trim() ? Number(price) : null,
        colorways: colorwaysPayload,
      }

      if (isEdit) {
        await api.patch(`/shirt-designs/${design!.id}`, payload)
        onSuccess(`Updated ${payload.designName}.`)
      } else {
        await api.post('/shirt-designs', payload)
        onSuccess(`Added ${payload.designName}.`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Design' : 'Add Design'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="design-name">
            Design Name
          </label>
          <input
            id="design-name"
            type="text"
            required
            value={designName}
            onChange={(event) => setDesignName(event.target.value)}
            placeholder="e.g. Kaix Logo Tee"
            aria-invalid={isDuplicateName || (attempted && !designName.trim())}
            className={
              isDuplicateName || (attempted && !designName.trim()) ? inputClassInvalid : inputClass
            }
          />
          {isDuplicateName && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              A design with this name already exists.
            </p>
          )}
        </div>

        <MaterialPhotoField
          previewSrc={photo.previewSrc}
          onFileChange={photo.handleFileChange}
          onRemove={photo.handleRemove}
          label="Product Photo"
          invalid={attempted && !photo.previewSrc}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="design-print-type">
              Print Type
            </label>
            <select
              id="design-print-type"
              required
              value={printType}
              onChange={(event) => setPrintType(event.target.value as PrintType)}
              className={inputClass}
            >
              <option value="SILKSCREEN">Silkscreen</option>
              <option value="DTF">DTF</option>
              <option value="HYBRID">Hybrid (DTF front + Silkscreen back)</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="design-price">
              Price per Piece <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <PriceInput id="design-price" value={price} onChange={setPrice} className="mt-1" />
          </div>
        </div>

        {printType === 'HYBRID' && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
            Each colorway below gets both a DTF print size (front) and a screen count (back) —
            create and link the physical screens from the Screen Rack page once saved.
          </p>
        )}

        {printType === 'SILKSCREEN' && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
            Set how many screens each colorway needs below (e.g. a 2-color ink separation needs
            2) — then create and link the physical screens from the Screen Rack page.
          </p>
        )}

        {printType === 'DTF' && (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
            Each colorway below gets its own print size — add one per colorway.
          </p>
        )}

        <div>
          <span className={labelClass}>Available Fits</span>
          <div
            className={`mt-1 flex flex-wrap gap-2 rounded-lg ${
              attempted && availableFits.length === 0 ? 'p-1 ring-1 ring-red-500' : ''
            }`}
          >
            {FIT_STYLE_OPTIONS.map((fit) => (
              <button
                key={fit}
                type="button"
                onClick={() => toggleFit(fit)}
                aria-pressed={availableFits.includes(fit)}
                className={pillClass(availableFits.includes(fit))}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className={labelClass}>Colorways</span>
            <button
              type="button"
              onClick={addColorwayRow}
              className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <Plus className="size-3.5" />
              Add Colorway
            </button>
          </div>
          {colorways.length > 0 ? (
            <div className="mt-2 space-y-2">
              <div
                className={`${colorwayGridClass(printType)} px-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400`}
              >
                <span>Image</span>
                <span>Color</span>
                {usesDtf(printType) && <span>Size</span>}
                {usesSilkscreen(printType) && <span>Screens</span>}
                <span />
              </div>
              {colorways.map((draft) => (
                <ColorwayRow
                  key={draft.key}
                  draft={draft}
                  printType={printType}
                  attempted={attempted}
                  onNameChange={(value) => updateColorwayName(draft.key, value)}
                  onFileChange={(file) => updateColorwayFile(draft.key, file)}
                  onRemovePhoto={() => removeColorwayPhoto(draft.key)}
                  onRemoveRow={() => removeColorwayRow(draft.key)}
                  onDtfSizeChange={(size) => updateColorwayDtfSize(draft.key, size)}
                  onScreensNeededChange={(count) => updateColorwayScreensNeeded(draft.key, count)}
                />
              ))}
            </div>
          ) : (
            attempted && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                At least one colorway is required.
              </p>
            )
          )}
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
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Design'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default DesignFormModal
