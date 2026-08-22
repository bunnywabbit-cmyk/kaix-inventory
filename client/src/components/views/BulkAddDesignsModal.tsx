import { ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { cldThumb } from '../../lib/cloudinaryImage'
import { DTF_PRINT_SIZE_OPTIONS, dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import { invalidBoxClass, invalidInputClass } from '../../lib/formValidation'
import { usesDtf, usesSilkscreen } from '../../lib/printType'
import { FIT_STYLE_OPTIONS, type FitStyle } from '../../lib/skuGenerator'
import type { DtfPrintSize, PrintType, ShirtDesign } from '../../types/api'
import Modal from '../ui/Modal'
import PriceInput from '../ui/PriceInput'
import QuantityInput from '../ui/QuantityInput'

interface BulkAddDesignsModalProps {
  onClose: () => void
  onSuccess: (message: string) => void
}

interface ColorwayDraft {
  key: string
  colorwayName: string
  imageFile: File | null
  imagePreview: string | null
  dtfPrintSize: DtfPrintSize | null
  screensNeeded: number
}

interface DesignDraft {
  key: string
  designName: string
  printType: PrintType
  price: string
  availableFits: FitStyle[]
  mainImageFile: File | null
  mainImagePreview: string | null
  colorways: ColorwayDraft[]
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const inputClassInvalid = `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`
const pillClass = (active: boolean) =>
  `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
    active
      ? 'border-sky-500 bg-sky-500 text-white'
      : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

function makeKey() {
  return Math.random().toString(36).slice(2)
}

function blankColorwayDraft(): ColorwayDraft {
  return {
    key: makeKey(),
    colorwayName: '',
    imageFile: null,
    imagePreview: null,
    dtfPrintSize: null,
    screensNeeded: 1,
  }
}

function blankDraft(): DesignDraft {
  return {
    key: makeKey(),
    designName: '',
    printType: 'SILKSCREEN',
    price: '',
    availableFits: [],
    mainImageFile: null,
    mainImagePreview: null,
    colorways: [blankColorwayDraft()],
  }
}

function isColorwayComplete(colorway: ColorwayDraft, printType: PrintType) {
  if (!colorway.colorwayName.trim()) return false
  if (!colorway.imagePreview) return false
  if (usesDtf(printType) && !colorway.dtfPrintSize) return false
  return true
}

function isDraftComplete(draft: DesignDraft) {
  if (!draft.designName.trim()) return false
  if (!draft.mainImagePreview) return false
  if (draft.availableFits.length === 0) return false
  if (draft.colorways.length === 0) return false
  return draft.colorways.every((colorway) => isColorwayComplete(colorway, draft.printType))
}

interface ImagePickerCellProps {
  previewSrc: string | null
  invalid: boolean
  ariaLabel: string
  onFileChange: (file: File | null) => void
  onRemove: () => void
}

// Compact photo picker used for both the main product image and each
// colorway's image within a bulk row — same interaction as DesignFormModal's
// ColorwayRow photo cell, just factored out since this modal needs several.
function ImagePickerCell({ previewSrc, invalid, ariaLabel, onFileChange, onRemove }: ImagePickerCellProps) {
  const inputId = useId()

  return previewSrc ? (
    <div className="relative shrink-0">
      <img
        src={cldThumb(previewSrc, 104) ?? undefined}
        alt=""
        className="size-12 rounded-md border border-slate-200 object-cover dark:border-slate-800"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${ariaLabel}`}
        className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
      >
        <X className="size-2.5" />
      </button>
    </div>
  ) : (
    <label
      htmlFor={inputId}
      className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-md border border-dashed text-slate-400 hover:border-sky-400 hover:text-sky-500 dark:text-slate-600 ${
        invalid ? invalidBoxClass : 'border-slate-300 dark:border-slate-700'
      }`}
    >
      <ImagePlus className="size-4" />
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        aria-label={ariaLabel}
        onChange={(event) => {
          onFileChange(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
        className="hidden"
      />
    </label>
  )
}

function BulkAddDesignsModal({ onClose, onSuccess }: BulkAddDesignsModalProps) {
  const [drafts, setDrafts] = useState<DesignDraft[]>([blankDraft()])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const updateDraft = (key: string, patch: Partial<DesignDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  const toggleFit = (key: string, fit: FitStyle) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.key === key
          ? {
              ...d,
              availableFits: d.availableFits.includes(fit)
                ? d.availableFits.filter((f) => f !== fit)
                : [...d.availableFits, fit],
            }
          : d,
      ),
    )
  }

  const addRow = () => setDrafts((prev) => [...prev, blankDraft()])
  const removeRow = (key: string) => setDrafts((prev) => prev.filter((d) => d.key !== key))

  const setMainImage = (key: string, file: File | null) =>
    updateDraft(key, {
      mainImageFile: file,
      mainImagePreview: file ? URL.createObjectURL(file) : null,
    })

  const addColorwayRow = (designKey: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === designKey ? { ...d, colorways: [...d.colorways, blankColorwayDraft()] } : d)),
    )
  }

  const removeColorwayRow = (designKey: string, colorwayKey: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.key === designKey
          ? { ...d, colorways: d.colorways.filter((c) => c.key !== colorwayKey) }
          : d,
      ),
    )
  }

  const updateColorway = (designKey: string, colorwayKey: string, patch: Partial<ColorwayDraft>) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.key === designKey
          ? {
              ...d,
              colorways: d.colorways.map((c) => (c.key === colorwayKey ? { ...c, ...patch } : c)),
            }
          : d,
      ),
    )
  }

  const setColorwayImage = (designKey: string, colorwayKey: string, file: File | null) =>
    updateColorway(designKey, colorwayKey, {
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null,
    })

  const canSubmit = drafts.length > 0 && drafts.every(isDraftComplete)

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
      const items = await Promise.all(
        drafts.map(async (draft) => {
          const [mainProductImage, colorways] = await Promise.all([
            api.upload('/uploads', draft.mainImageFile!).then((res) => res.url),
            Promise.all(
              draft.colorways.map(async (colorway) => ({
                colorwayName: colorway.colorwayName.trim(),
                imageUrl: (await api.upload('/uploads', colorway.imageFile!)).url,
                dtfPrintSize: usesDtf(draft.printType) ? colorway.dtfPrintSize : null,
                screensNeeded: usesSilkscreen(draft.printType) ? colorway.screensNeeded : 1,
              })),
            ),
          ])
          return {
            designName: draft.designName.trim(),
            printType: draft.printType,
            mainProductImage,
            availableFits: draft.availableFits,
            price: draft.price.trim() ? Number(draft.price) : null,
            colorways,
          }
        }),
      )

      const created = await api.post<ShirtDesign[]>('/shirt-designs/batch', { items })
      onSuccess(`Added ${created.length} design${created.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Mass Upload Designs" onClose={onClose} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
          Add every design's details and photos here — each design needs at least one colorway,
          and you can add more with its own Add Colorway button.
        </p>

        <div className="space-y-3">
          {drafts.map((draft, index) => {
            const nameInvalid = attempted && !draft.designName.trim()
            const mainImageInvalid = attempted && !draft.mainImagePreview
            const fitsInvalid = attempted && draft.availableFits.length === 0

            return (
              <div
                key={draft.key}
                className="space-y-2.5 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Design {index + 1}</span>
                  {drafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(draft.key)}
                      aria-label={`Remove design ${index + 1}`}
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <ImagePickerCell
                    previewSrc={draft.mainImagePreview}
                    invalid={mainImageInvalid}
                    ariaLabel={`Design ${index + 1} product photo`}
                    onFileChange={(file) => setMainImage(draft.key, file)}
                    onRemove={() => setMainImage(draft.key, null)}
                  />
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-[1fr_9rem_7rem]">
                    <input
                      type="text"
                      value={draft.designName}
                      onChange={(event) => updateDraft(draft.key, { designName: event.target.value })}
                      placeholder="Design name"
                      aria-label={`Design ${index + 1} name`}
                      className={nameInvalid ? inputClassInvalid : inputClass}
                    />
                    <select
                      value={draft.printType}
                      onChange={(event) =>
                        updateDraft(draft.key, { printType: event.target.value as PrintType })
                      }
                      aria-label={`Design ${index + 1} print type`}
                      className={inputClass}
                    >
                      <option value="SILKSCREEN">Silkscreen</option>
                      <option value="DTF">DTF</option>
                      <option value="HYBRID">Hybrid</option>
                    </select>
                    <PriceInput
                      id={`bulk-design-price-${draft.key}`}
                      value={draft.price}
                      onChange={(value) => updateDraft(draft.key, { price: value })}
                      ariaLabel={`Design ${index + 1} price per piece`}
                    />
                  </div>
                </div>

                <div className={`flex flex-wrap gap-1.5 rounded-lg ${fitsInvalid ? 'p-1 ring-1 ring-red-500' : ''}`}>
                  {FIT_STYLE_OPTIONS.map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => toggleFit(draft.key, fit)}
                      aria-pressed={draft.availableFits.includes(fit)}
                      className={pillClass(draft.availableFits.includes(fit))}
                    >
                      {fit}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                  {draft.colorways.map((colorway, colorwayIndex) => {
                    const colorwayInvalid = attempted && !colorway.colorwayName.trim()
                    const colorwayImageInvalid = attempted && !colorway.imagePreview
                    const dtfSizeInvalid =
                      attempted && usesDtf(draft.printType) && !colorway.dtfPrintSize

                    return (
                      <div key={colorway.key} className="flex items-center gap-2.5">
                        <ImagePickerCell
                          previewSrc={colorway.imagePreview}
                          invalid={colorwayImageInvalid}
                          ariaLabel={`Design ${index + 1} colorway ${colorwayIndex + 1} photo`}
                          onFileChange={(file) => setColorwayImage(draft.key, colorway.key, file)}
                          onRemove={() => setColorwayImage(draft.key, colorway.key, null)}
                        />
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto]">
                          <input
                            type="text"
                            value={colorway.colorwayName}
                            onChange={(event) =>
                              updateColorway(draft.key, colorway.key, { colorwayName: event.target.value })
                            }
                            placeholder="Colorway, e.g. Black Shirt / White Ink"
                            aria-label={`Design ${index + 1} colorway ${colorwayIndex + 1} name`}
                            className={colorwayInvalid ? inputClassInvalid : inputClass}
                          />
                          {usesDtf(draft.printType) && (
                            <div
                              className={`flex items-center gap-1.5 rounded-lg ${dtfSizeInvalid ? 'p-1 ring-1 ring-red-500' : ''}`}
                            >
                              {DTF_PRINT_SIZE_OPTIONS.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() =>
                                    updateColorway(draft.key, colorway.key, { dtfPrintSize: option })
                                  }
                                  aria-pressed={colorway.dtfPrintSize === option}
                                  className={pillClass(colorway.dtfPrintSize === option)}
                                >
                                  {dtfPrintSizeLabels[option]}
                                </button>
                              ))}
                            </div>
                          )}
                          {usesSilkscreen(draft.printType) && (
                            <QuantityInput
                              min={1}
                              value={String(colorway.screensNeeded)}
                              onChange={(value) =>
                                updateColorway(draft.key, colorway.key, {
                                  screensNeeded: Math.max(1, Number(value) || 1),
                                })
                              }
                              ariaLabel={`Design ${index + 1} colorway ${colorwayIndex + 1} screens needed`}
                              dense
                            />
                          )}
                        </div>
                        {draft.colorways.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColorwayRow(draft.key, colorway.key)}
                            aria-label={`Remove design ${index + 1} colorway ${colorwayIndex + 1}`}
                            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => addColorwayRow(draft.key)}
                    className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    <Plus className="size-3.5" />
                    Add Colorway
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          <Plus className="size-3.5" />
          Add Another Design
        </button>

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
            Save {drafts.length} Design{drafts.length === 1 ? '' : 's'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BulkAddDesignsModal
