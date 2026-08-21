import { ImageOff, Loader2, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { invalidInputClass } from '../../lib/formValidation'
import { SIZE_ORDER, sortSizes } from '../../lib/variantMatrix'
import type { PrintRun } from '../../types/api'
import Collapse, { COLLAPSE_DURATION_MS } from '../ui/Collapse'
import { DesignSelect } from '../ui/ColorwayPicker'
import Modal from '../ui/Modal'

interface PrintRunFormModalProps {
  printRun?: PrintRun
  onClose: () => void
  onSuccess: (message: string) => void
}

interface SizeQty {
  size: string
  quantity: number
}

interface ItemDraft {
  key: string
  designId: string
  designName: string
  mainProductImage: string
  colorwayId: string | null
  colorwayName: string | null
  colorwayImageUrl: string | null
  garmentStyle: string
  color: string
  sizes: SizeQty[]
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const inputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`
const labelClass = 'text-xs font-medium text-slate-500'
const pillClass = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? 'border-sky-500 bg-sky-500 text-white'
      : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
  }`
const qtyInputClass =
  'w-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold tabular-nums outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'

function makeItemKey() {
  return Math.random().toString(36).slice(2)
}

function PrintRunFormModal({ printRun, onClose, onSuccess }: PrintRunFormModalProps) {
  const isEdit = Boolean(printRun)
  const { data: designs } = useShirtDesigns()
  // Unlisted designs stay fully intact in already-added run items (those
  // carry their own design/colorway info inline, independent of this list)
  // but shouldn't be offered when adding a new line to the run.
  const pickableDesigns = useMemo(() => (designs ?? []).filter((d) => d.active), [designs])

  const [items, setItems] = useState<ItemDraft[]>(
    () =>
      printRun?.items.map((item) => ({
        key: item.id,
        designId: item.designId,
        designName: item.design.designName,
        mainProductImage: item.design.mainProductImage,
        colorwayId: item.colorwayId,
        colorwayName: item.colorway?.colorwayName ?? null,
        colorwayImageUrl: item.colorway?.imageUrl ?? null,
        garmentStyle: item.garmentStyle,
        color: item.color,
        sizes: item.sizes.map((s) => ({ size: s.size, quantity: s.quantity })),
      })) ?? [],
  )

  // Staging fields for the design currently being configured, before it's
  // added to the `items` list above.
  const [designId, setDesignId] = useState('')
  const [colorwayId, setColorwayId] = useState<string | null>(null)
  const [color, setColor] = useState('')
  const [garmentStyle, setGarmentStyle] = useState('')
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  // Key of the item in `items` currently loaded into the staging fields for
  // editing, or null when the staging fields are for adding a brand-new one.
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  // Tracks a click on "Add to Run" / "Save Changes" that found the staging
  // fields incomplete — lights up whichever of those fields are still empty.
  const [attemptedItem, setAttemptedItem] = useState(false)

  // Drives the Collapse sections below independently of the staging fields
  // themselves — closing this immediately while the fields still hold their
  // values (cleared a beat later, once the animation finishes) is what makes
  // "Add to Run" collapse smoothly instead of the content vanishing first and
  // leaving an empty box to shrink.
  const [designPanelOpen, setDesignPanelOpen] = useState(false)
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(resetTimeoutRef.current)
  }, [])

  const design = useMemo(
    () => pickableDesigns.find((d) => d.id === designId) ?? null,
    [pickableDesigns, designId],
  )

  const resetStaging = () => {
    setDesignId('')
    setColorwayId(null)
    setColor('')
    setGarmentStyle('')
    setSelectedSizes([])
    setQuantities({})
    setAttemptedItem(false)
  }

  const handleDesignChange = (id: string) => {
    const nextDesign = pickableDesigns.find((d) => d.id === id) ?? null
    window.clearTimeout(resetTimeoutRef.current)
    setDesignId(id)
    // Skip the extra click when there's only one possible answer anyway.
    if (nextDesign?.colorways.length === 1) {
      setColorwayId(nextDesign.colorways[0]!.id)
      setColor(nextDesign.colorways[0]!.colorwayName)
    } else {
      setColorwayId(null)
      setColor('')
    }
    setGarmentStyle(nextDesign?.availableFits.length === 1 ? nextDesign.availableFits[0]! : '')
    setSelectedSizes([])
    setQuantities({})
    setDesignPanelOpen(true)
  }

  const handleColorwayChange = (id: string, colorwayName: string) => {
    setColorwayId(id)
    setColor(colorwayName)
  }

  // Close the panel right away, but keep the field values around until the
  // close animation finishes so it has content to shrink instead of an
  // already-empty box.
  const closePanel = () => {
    setDesignPanelOpen(false)
    resetTimeoutRef.current = window.setTimeout(resetStaging, COLLAPSE_DURATION_MS)
  }

  const startEditItem = (item: ItemDraft) => {
    window.clearTimeout(resetTimeoutRef.current)
    setEditingKey(item.key)
    setDesignId(item.designId)
    setColorwayId(item.colorwayId)
    setColor(item.color)
    setGarmentStyle(item.garmentStyle)
    setSelectedSizes(item.sizes.map((s) => s.size))
    setQuantities(Object.fromEntries(item.sizes.map((s) => [s.size, String(s.quantity)])))
    setAttemptedItem(false)
    setDesignPanelOpen(true)
  }

  const cancelEdit = () => {
    setEditingKey(null)
    closePanel()
  }

  const toggleSize = (sizeOption: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeOption) ? prev.filter((s) => s !== sizeOption) : [...prev, sizeOption],
    )
  }

  const handleQuantityChange = (sizeOption: string) => (event: ChangeEvent<HTMLInputElement>) =>
    setQuantities((prev) => ({ ...prev, [sizeOption]: event.target.value }))

  const orderedSelectedSizes = useMemo(
    () => SIZE_ORDER.filter((sizeOption) => selectedSizes.includes(sizeOption)),
    [selectedSizes],
  )

  const parsedEntries = useMemo(
    () =>
      orderedSelectedSizes
        .map((sizeOption) => ({
          size: sizeOption,
          quantity: Math.max(0, Math.trunc(Number(quantities[sizeOption]) || 0)),
        }))
        .filter((entry) => entry.quantity > 0),
    [orderedSelectedSizes, quantities],
  )

  const canAddItem = Boolean(
    design &&
      (design.colorways.length === 0 || colorwayId) &&
      color.trim() &&
      (design.availableFits.length === 0 || garmentStyle) &&
      parsedEntries.length > 0,
  )

  const handleAddItem = () => {
    if (!design || !canAddItem) {
      setAttemptedItem(true)
      return
    }
    const colorway = design.colorways.find((c) => c.id === colorwayId) ?? null
    const trimmedColor = color.trim()
    const trimmedGarmentStyle = garmentStyle.trim() || 'Standard'

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.designId === design.id &&
          item.colorwayId === colorwayId &&
          item.garmentStyle === trimmedGarmentStyle &&
          item.color === trimmedColor,
      )

      if (existingIndex === -1) {
        return [
          ...prev,
          {
            key: makeItemKey(),
            designId: design.id,
            designName: design.designName,
            mainProductImage: design.mainProductImage,
            colorwayId,
            colorwayName: colorway?.colorwayName ?? null,
            colorwayImageUrl: colorway?.imageUrl ?? null,
            garmentStyle: trimmedGarmentStyle,
            color: trimmedColor,
            sizes: parsedEntries,
          },
        ]
      }

      // Same design + colorway + fit already on the list — merge sizes into
      // that card instead of showing a duplicate, summing any size picked twice.
      const existing = prev[existingIndex]!
      const mergedSizes = [...existing.sizes]
      for (const entry of parsedEntries) {
        const sizeIndex = mergedSizes.findIndex((s) => s.size === entry.size)
        if (sizeIndex === -1) {
          mergedSizes.push(entry)
        } else {
          mergedSizes[sizeIndex] = {
            size: entry.size,
            quantity: mergedSizes[sizeIndex]!.quantity + entry.quantity,
          }
        }
      }
      const next = [...prev]
      next[existingIndex] = { ...existing, sizes: mergedSizes }
      return next
    })

    closePanel()
  }

  // Colorway, sizes, and quantity can be changed after the fact; the design
  // (and its fit) can't — remove the card and add it again for that instead.
  const handleSaveEdit = () => {
    if (!design || !editingKey || !canAddItem) {
      setAttemptedItem(true)
      return
    }
    const colorway = design.colorways.find((c) => c.id === colorwayId) ?? null
    const trimmedColor = color.trim()

    setItems((prev) =>
      prev.map((item) =>
        item.key === editingKey
          ? {
              ...item,
              colorwayId,
              colorwayName: colorway?.colorwayName ?? null,
              colorwayImageUrl: colorway?.imageUrl ?? null,
              color: trimmedColor,
              sizes: parsedEntries,
            }
          : item,
      ),
    )

    setEditingKey(null)
    closePanel()
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
    if (editingKey === key) cancelEdit()
  }

  const canSubmit = items.length > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setAttempted(true)
      setFormError('Add at least one design to the print run before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const payload = {
      items: items.map((item) => ({
        designId: item.designId,
        colorwayId: item.colorwayId,
        garmentStyle: item.garmentStyle,
        color: item.color,
        sizes: item.sizes,
      })),
    }

    try {
      if (isEdit) {
        await api.patch(`/print-runs/${printRun!.id}`, payload)
        onSuccess(`Updated print run — ${items.length} design${items.length === 1 ? '' : 's'}.`)
      } else {
        await api.post('/print-runs', payload)
        onSuccess(`Created print run — ${items.length} design${items.length === 1 ? '' : 's'}.`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Print Run' : 'Create Print Run'} onClose={onClose} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <span className={labelClass}>{editingKey ? 'Edit Design' : 'Add a Design'}</span>

            <div>
              {editingKey ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  {design?.mainProductImage ? (
                    <img
                      src={design.mainProductImage}
                      alt=""
                      className="size-8 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 dark:bg-slate-800">
                      <ImageOff className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-slate-900 dark:text-slate-100">
                    {design?.designName}
                  </span>
                  {garmentStyle && (
                    <span className="shrink-0 text-xs text-slate-400">{garmentStyle}</span>
                  )}
                </div>
              ) : (
                <div
                  className={`rounded-lg ${
                    attemptedItem && !design ? 'p-1 ring-1 ring-red-500' : ''
                  }`}
                >
                  <DesignSelect designs={pickableDesigns} value={designId} onChange={handleDesignChange} />
                </div>
              )}
            </div>

            <Collapse open={designPanelOpen}>
              <div className="space-y-3">
                {design && design.colorways.length > 0 && (
                  <div>
                    <span className={labelClass}>Colorway</span>
                    <div
                      className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
                        attemptedItem && !colorwayId ? 'p-1 ring-1 ring-red-500' : ''
                      }`}
                    >
                      {design.colorways.map((colorway) => (
                        <button
                          key={colorway.id}
                          type="button"
                          onClick={() => handleColorwayChange(colorway.id, colorway.colorwayName)}
                          aria-pressed={colorwayId === colorway.id}
                          className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors ${
                            colorwayId === colorway.id
                              ? 'border-sky-500 bg-sky-500 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                        >
                          {colorway.imageUrl ? (
                            <img
                              src={colorway.imageUrl}
                              alt=""
                              className="size-6 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800">
                              <ImageOff className="size-3" />
                            </span>
                          )}
                          {colorway.colorwayName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {design && design.colorways.length === 0 && (
                  <div>
                    <label className={labelClass} htmlFor="printrun-color">
                      Color
                    </label>
                    <input
                      id="printrun-color"
                      type="text"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      placeholder="e.g. Black"
                      className={attemptedItem && !color.trim() ? inputClassInvalid : inputClass}
                    />
                  </div>
                )}

                {!editingKey && design && design.availableFits.length > 0 && (
                  <div>
                    <span className={labelClass}>Fit</span>
                    <div
                      className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
                        attemptedItem && !garmentStyle ? 'p-1 ring-1 ring-red-500' : ''
                      }`}
                    >
                      {design.availableFits.map((fit) => (
                        <button
                          key={fit}
                          type="button"
                          onClick={() => setGarmentStyle(fit)}
                          aria-pressed={garmentStyle === fit}
                          className={pillClass(garmentStyle === fit)}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {design && (
                  <div>
                    <span className={labelClass}>Sizes</span>
                    <div
                      className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
                        attemptedItem && parsedEntries.length === 0 ? 'p-1 ring-1 ring-red-500' : ''
                      }`}
                    >
                      {SIZE_ORDER.map((sizeOption) => (
                        <button
                          key={sizeOption}
                          type="button"
                          onClick={() => toggleSize(sizeOption)}
                          aria-pressed={selectedSizes.includes(sizeOption)}
                          className={pillClass(selectedSizes.includes(sizeOption))}
                        >
                          {sizeOption}
                        </button>
                      ))}
                    </div>
                    {attemptedItem && parsedEntries.length === 0 && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Select a size and enter a quantity.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Collapse>

            <Collapse open={designPanelOpen && orderedSelectedSizes.length > 0}>
              <div>
                <span className={labelClass}>Quantity per Size</span>
                <div className="mt-1.5 space-y-1.5">
                  {orderedSelectedSizes.map((sizeOption) => (
                    <div key={sizeOption} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {sizeOption}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={quantities[sizeOption] ?? ''}
                        onChange={handleQuantityChange(sizeOption)}
                        placeholder="0"
                        className={qtyInputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Collapse>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={editingKey ? handleSaveEdit : handleAddItem}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Plus className="size-4" />
                {editingKey ? 'Save Changes' : 'Add to Run'}
              </button>
              {editingKey && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel edit
                </button>
              )}
            </div>
            {attemptedItem && !canAddItem && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Fill in the highlighted fields to {editingKey ? 'save changes' : 'add this design'}.
              </p>
            )}
          </div>

          <div
            className={`flex max-h-128 flex-col rounded-xl border ${
              attempted && items.length === 0
                ? 'border-red-500 ring-1 ring-red-500 dark:border-red-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <span className={labelClass}>Print List</span>
              <p className="mt-0.5 text-xs text-slate-400">
                {items.length === 0
                  ? 'Nothing added yet'
                  : `${items.length} design${items.length === 1 ? '' : 's'} · ${items.reduce((sum, item) => sum + item.sizes.reduce((s, sz) => s + sz.quantity, 0), 0)} pcs`}
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {items.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-slate-400">
                  Designs you add will show up here.
                </p>
              ) : (
                items.map((item) => {
                  const imageUrl = item.colorwayImageUrl || item.mainProductImage
                  return (
                    <div
                      key={item.key}
                      className={`flex overflow-hidden rounded-lg border transition-colors ${
                        item.key === editingKey
                          ? 'border-sky-400 ring-1 ring-sky-400 dark:border-sky-500 dark:ring-sky-500'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="w-20 shrink-0 self-stretch object-cover" />
                      ) : (
                        <span className="flex w-20 shrink-0 items-center justify-center self-stretch bg-slate-100 text-slate-300 dark:bg-slate-800">
                          <ImageOff className="size-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1 py-2.5 pl-2.5">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.designName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {[item.colorwayName ?? item.color, item.garmentStyle].join(' · ')}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {sortSizes(item.sizes.map((s) => s.size)).map((size) => {
                            const entry = item.sizes.find((s) => s.size === size)!
                            return (
                              <span
                                key={size}
                                className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                              >
                                {size} × {entry.quantity} pc{entry.quantity === 1 ? '' : 's'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <div className="mr-1.5 mt-1.5 flex h-fit shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => startEditItem(item)}
                          aria-label={`Edit ${item.designName}`}
                          className="rounded-md p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.designName}`}
                          className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
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
            {isEdit ? 'Save Changes' : 'Create Print Run'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default PrintRunFormModal
