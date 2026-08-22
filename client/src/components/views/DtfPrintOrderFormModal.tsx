import { ImageOff, Loader2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useShirtDesigns } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { cldThumb } from '../../lib/cloudinaryImage'
import { dtfPrintSizeLabels } from '../../lib/dtfPrintSize'
import { usesDtf } from '../../lib/printType'
import type { DtfPrintOrder } from '../../types/api'
import { DesignSelect } from '../ui/ColorwayPicker'
import Modal from '../ui/Modal'
import QuantityInput from '../ui/QuantityInput'

interface DtfPrintOrderFormModalProps {
  order?: DtfPrintOrder
  onClose: () => void
  onSuccess: (message: string) => void
}

const labelClass = 'text-xs font-medium text-slate-500'

function DtfPrintOrderFormModal({ order, onClose, onSuccess }: DtfPrintOrderFormModalProps) {
  const isEdit = Boolean(order)
  const { data: designs } = useShirtDesigns()

  // Only colorways with a print size set (on the Designs page) are orderable.
  // Designs are only shown if at least one of their colorways qualifies.
  const orderableDesigns = useMemo(
    () =>
      (designs ?? [])
        .filter((d) => usesDtf(d.printType))
        .map((d) => ({
          ...d,
          colorways: d.colorways.filter((c) => c.dtfPrintSize),
        }))
        .filter((d) => d.colorways.length > 0),
    [designs],
  )

  const [designId, setDesignId] = useState(() => order?.colorway.shirtDesignId ?? '')
  const [colorwayId, setColorwayId] = useState(() => order?.colorwayId ?? '')
  const [quantity, setQuantity] = useState(() => (order ? String(order.quantity) : ''))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const design = orderableDesigns.find((d) => d.id === designId) ?? null
  const colorway = design?.colorways.find((c) => c.id === colorwayId) ?? null
  const parsedQuantity = Math.max(0, Math.trunc(Number(quantity) || 0))
  const canSubmit = Boolean(colorwayId && parsedQuantity > 0)

  const handleDesignChange = (id: string) => {
    const nextDesign = orderableDesigns.find((d) => d.id === id)
    setDesignId(id)
    // Skip the extra click when there's only one possible answer anyway.
    setColorwayId(nextDesign?.colorways.length === 1 ? nextDesign.colorways[0]!.id : '')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const label = `${design?.designName ?? 'design'} (${colorway?.colorwayName ?? ''})`

    try {
      if (isEdit) {
        await api.patch(`/dtf-print-orders/${order!.id}`, { colorwayId, quantity: parsedQuantity })
        onSuccess(`Updated ${label}.`)
      } else {
        await api.post('/dtf-print-orders', { colorwayId, quantity: parsedQuantity })
        onSuccess(`Added ${label} to the order list.`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Order Item' : 'Add to Order List'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <span className={labelClass}>Design</span>
          <div className={`mt-1 rounded-lg ${attempted && !design ? 'p-1 ring-1 ring-red-500' : ''}`}>
            <DesignSelect designs={orderableDesigns} value={designId} onChange={handleDesignChange} />
          </div>
          {orderableDesigns.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              No DTF colorways with a print size yet — set one from the Designs page first.
            </p>
          )}
        </div>

        {design && design.colorways.length > 0 && (
          <div>
            <span className={labelClass}>Colorway</span>
            <div
              className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
                attempted && !colorwayId ? 'p-1 ring-1 ring-red-500' : ''
              }`}
            >
              {design.colorways.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorwayId(c.id)}
                  aria-pressed={colorwayId === c.id}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors ${
                    colorwayId === c.id
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.imageUrl ? (
                    <img src={cldThumb(c.imageUrl, 56)} alt="" className="size-6 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800">
                      <ImageOff className="size-3" />
                    </span>
                  )}
                  {c.colorwayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {colorway && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
            {colorway.imageUrl ? (
              <img
                src={cldThumb(colorway.imageUrl, 104)}
                alt=""
                className="size-12 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 dark:bg-slate-800">
                <ImageOff className="size-4" />
              </span>
            )}
            <p className="text-xs text-slate-500">
              Print sized{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {colorway.dtfPrintSize ? dtfPrintSizeLabels[colorway.dtfPrintSize] : '—'}
              </span>
              .
            </p>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="dtf-order-quantity">
            Quantity
          </label>
          <QuantityInput
            id="dtf-order-quantity"
            min={1}
            value={quantity}
            onChange={setQuantity}
            placeholder="e.g. 50"
            ariaLabel="Quantity"
            invalid={attempted && parsedQuantity <= 0}
            className="mt-1 w-full"
          />
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
            {isEdit ? 'Save Changes' : 'Add to Order List'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default DtfPrintOrderFormModal
