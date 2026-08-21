import { ImageOff, Loader2 } from 'lucide-react'
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { cldThumb } from '../../lib/cloudinaryImage'
import { invalidInputClass } from '../../lib/formValidation'
import { SIZE_ORDER } from '../../lib/variantMatrix'
import type { FinishedGood } from '../../types/api'
import Collapse from '../ui/Collapse'
import { DesignSelect } from '../ui/ColorwayPicker'
import Modal from '../ui/Modal'
import PriceInput from '../ui/PriceInput'

interface AddStockModalProps {
  finishedGoods: FinishedGood[]
  onClose: () => void
  onSuccess: (message: string) => void
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

function AddStockModal({ finishedGoods, onClose, onSuccess }: AddStockModalProps) {
  const { data: designs } = useShirtDesigns()

  const [designId, setDesignId] = useState('')
  const [colorwayId, setColorwayId] = useState<string | null>(null)
  const [color, setColor] = useState('')
  const [garmentStyle, setGarmentStyle] = useState('')
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [unitPrice, setUnitPrice] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const design = useMemo(() => designs?.find((d) => d.id === designId) ?? null, [designs, designId])

  const handleDesignChange = (id: string) => {
    const nextDesign = designs?.find((d) => d.id === id) ?? null
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
    setUnitPrice(nextDesign?.price != null ? String(nextDesign.price) : '')
  }

  const handleColorwayChange = (id: string, colorwayName: string) => {
    setColorwayId(id)
    setColor(colorwayName)
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

  const totalToAdd = parsedEntries.reduce((sum, entry) => sum + entry.quantity, 0)

  const canSubmit = Boolean(
    design &&
      (design.colorways.length === 0 || colorwayId) &&
      color.trim() &&
      (design.availableFits.length === 0 || garmentStyle) &&
      parsedEntries.length > 0,
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!design || !canSubmit) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const trimmedColor = color.trim()
    const trimmedGarmentStyle = garmentStyle.trim() || 'Standard'
    const parsedUnitPrice = unitPrice.trim() ? Number(unitPrice) : undefined

    try {
      for (const entry of parsedEntries) {
        const existing = finishedGoods.find(
          (item) =>
            item.designId === design.id &&
            (item.colorwayId ?? null) === colorwayId &&
            item.garmentStyle === trimmedGarmentStyle &&
            item.color === trimmedColor &&
            item.size === entry.size,
        )

        if (existing) {
          await api.post(`/finished-goods/${existing.id}/adjust-stock`, {
            delta: entry.quantity,
            unitPrice: parsedUnitPrice,
          })
        } else {
          await api.post('/finished-goods', {
            designId: design.id,
            colorwayId,
            garmentStyle: trimmedGarmentStyle,
            color: trimmedColor,
            size: entry.size,
            quantityOnHand: entry.quantity,
            unitPrice: parsedUnitPrice,
          })
        }
      }

      const sizesLabel = parsedEntries.map((entry) => `${entry.size} (${entry.quantity})`).join(', ')
      onSuccess(`Added ${totalToAdd} of ${design.designName} (${trimmedColor}) — ${sizesLabel}.`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <span className={labelClass}>Design</span>
          <div
            className={`mt-1 rounded-lg ${
              attempted && !design ? 'p-1 ring-1 ring-red-500' : ''
            }`}
          >
            <DesignSelect designs={designs ?? []} value={designId} onChange={handleDesignChange} />
          </div>
        </div>

        <Collapse open={Boolean(design)}>
          <div className="space-y-3">
            {design && design.colorways.length > 0 && (
              <div>
                <span className={labelClass}>Colorway</span>
                <div
                  className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
                    attempted && !colorwayId ? 'p-1 ring-1 ring-red-500' : ''
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
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {colorway.imageUrl ? (
                        <img src={cldThumb(colorway.imageUrl, 56)} alt="" className="size-6 shrink-0 rounded-full object-cover" />
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
                <label className={labelClass} htmlFor="stock-color">
                  Color
                </label>
                <input
                  id="stock-color"
                  type="text"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="e.g. Black"
                  className={attempted && !color.trim() ? inputClassInvalid : inputClass}
                />
              </div>
            )}

            {design && design.availableFits.length > 0 && (
              <div>
                <span className={labelClass}>Fit</span>
                <div
                  className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
                    attempted && !garmentStyle ? 'p-1 ring-1 ring-red-500' : ''
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
                <label className={labelClass} htmlFor="stock-unit-price">
                  Price per Piece <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <PriceInput id="stock-unit-price" value={unitPrice} onChange={setUnitPrice} className="mt-1" />
              </div>
            )}
          </div>
        </Collapse>

        <div>
          <span className={labelClass}>Sizes</span>
          <div
            className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
              attempted && parsedEntries.length === 0 ? 'p-1 ring-1 ring-red-500' : ''
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
          {attempted && parsedEntries.length === 0 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Select a size and enter a quantity.
            </p>
          )}
        </div>

        <Collapse open={orderedSelectedSizes.length > 0}>
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
            {totalToAdd > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Total to add: <span className="font-semibold text-slate-900 dark:text-white">{totalToAdd}</span>
              </p>
            )}
          </div>
        </Collapse>

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
            Add Stock
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddStockModal
