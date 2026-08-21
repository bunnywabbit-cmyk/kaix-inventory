import { ImageOff, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { cldThumb } from '../../lib/cloudinaryImage'
import { invalidInputClass } from '../../lib/formValidation'
import type { FinishedGood } from '../../types/api'
import Modal from '../ui/Modal'
import type { StockGroup } from './OnHandStock'

interface SellStockModalProps {
  group: StockGroup
  onClose: () => void
  onSuccess: (message: string) => void
}

const labelClass = 'text-xs font-medium text-slate-500'
const qtyInputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const qtyInputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`

function SellStockModal({ group, onClose, onSuccess }: SellStockModalProps) {
  // Skip the extra click when there's only one size to sell from anyway.
  const [sizeId, setSizeId] = useState(group.sizes.length === 1 ? group.sizes[0]!.id : '')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const selectedSize = group.sizes.find((entry) => entry.id === sizeId) ?? null
  const parsedQuantity = Math.trunc(Number(quantity)) || 0
  const canSubmit = Boolean(selectedSize && parsedQuantity > 0 && parsedQuantity <= selectedSize.quantity)

  const imageUrl = group.colorway?.imageUrl || group.design.mainProductImage

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedSize || !canSubmit) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const updated = await api.post<FinishedGood>(`/finished-goods/${selectedSize.id}/adjust-stock`, {
        delta: -parsedQuantity,
      })
      onSuccess(
        `Sold ${parsedQuantity} of ${group.design.designName} (${selectedSize.size}) — ${updated.quantityOnHand} left.`,
      )
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Sell Stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
          {imageUrl ? (
            <img src={cldThumb(imageUrl, 104)} alt="" className="size-12 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 dark:bg-slate-800">
              <ImageOff className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {group.design.designName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {[group.colorway?.colorwayName, group.garmentStyle].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <div>
          <span className={labelClass}>Size</span>
          <div
            className={`mt-1.5 flex flex-wrap gap-2 rounded-lg ${
              attempted && !selectedSize ? 'p-1 ring-1 ring-red-500' : ''
            }`}
          >
            {group.sizes.map((entry) => {
              const active = sizeId === entry.id
              const sellable = entry.quantity > 0
              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={!sellable}
                  onClick={() => setSizeId(entry.id)}
                  aria-pressed={active}
                  title={sellable ? undefined : 'Nothing left to sell in this size'}
                  className={`flex flex-col items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    !sellable
                      ? 'cursor-not-allowed border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700'
                      : active
                        ? 'border-sky-500 bg-sky-500 text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {entry.size}
                  <span className="tabular-nums">{entry.quantity}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="sell-quantity">
            Quantity to Sell{' '}
            {selectedSize && (
              <span className="font-normal text-slate-400">({selectedSize.quantity} in stock)</span>
            )}
          </label>
          <input
            id="sell-quantity"
            type="number"
            min={1}
            max={selectedSize?.quantity}
            disabled={!selectedSize}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="0"
            className={
              attempted && !(parsedQuantity > 0 && parsedQuantity <= (selectedSize?.quantity ?? 0))
                ? qtyInputClassInvalid
                : qtyInputClass
            }
          />
          {selectedSize && parsedQuantity > selectedSize.quantity && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Only {selectedSize.quantity} in stock for this size.
            </p>
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
            Sell
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SellStockModal
