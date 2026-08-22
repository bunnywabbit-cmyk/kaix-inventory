import { Loader2 } from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { analyzeVariantGroup } from '../../lib/variantMatrix'
import type { RawMaterial } from '../../types/api'
import Modal from '../ui/Modal'
import QuantityInput from '../ui/QuantityInput'

interface UseStockModalProps {
  items: RawMaterial[]
  onClose: () => void
  onSuccess: (message: string, updatedItems: RawMaterial[]) => void
}

function UseStockModal({ items, onClose, onSuccess }: UseStockModalProps) {
  const first = items[0]!
  const isGroup = items.length > 1
  const { matrixReady, colors, sizes } = useMemo(() => analyzeVariantGroup(items), [items])
  const cellFor = (color: string, size: string) =>
    items.find((item) => item.color === color && item.size === size)

  const [deltas, setDeltas] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleDeltaChange = (id: string) => (value: string) =>
    setDeltas((prev) => ({ ...prev, [id]: value }))

  const rawUsage = useCallback(
    (item: RawMaterial) => Math.max(0, Math.trunc(Number(deltas[item.id]) || 0)),
    [deltas],
  )

  const parsedUsages = useMemo(
    () => items.map((item) => ({ item, delta: rawUsage(item) })).filter((entry) => entry.delta > 0),
    [items, rawUsage],
  )

  const overLimitItems = useMemo(
    () => items.filter((item) => rawUsage(item) > item.quantity),
    [items, rawUsage],
  )

  const totalToUse = parsedUsages.reduce((sum, entry) => sum + entry.delta, 0)
  const canSubmit = parsedUsages.length > 0 && overLimitItems.length === 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setFormError(
        overLimitItems.length > 0
          ? 'Fix the highlighted amounts — not enough on hand.'
          : 'Enter an amount for at least one item.',
      )
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const adjustments = parsedUsages.map(({ item, delta }) => ({ id: item.id, delta: -delta }))
      const updated = await api.post<RawMaterial[]>('/raw-materials/adjust-stock-batch', {
        adjustments,
      })

      const label = isGroup
        ? `${parsedUsages.length} variant${parsedUsages.length === 1 ? '' : 's'} of ${first.name}`
        : first.name
      onSuccess(`Used ${totalToUse} ${first.unit ?? ''} of ${label}.`.replace(/\s+/g, ' ').trim(), updated)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Use ${first.name}`} onClose={onClose} size={isGroup ? 'xl' : 'md'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isGroup ? (
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500">Current Stock</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {first.quantity}{' '}
                <span className="text-sm font-normal text-slate-500">{first.unit}</span>
              </p>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500" htmlFor="use-amount">
                Amount Used
              </label>
              <QuantityInput
                id="use-amount"
                max={first.quantity}
                autoFocus
                value={deltas[first.id] ?? ''}
                onChange={handleDeltaChange(first.id)}
                placeholder="0"
                ariaLabel="Amount used"
                accent="red"
                className="mt-1 w-full"
              />
            </div>
          </div>
        ) : matrixReady ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:border-slate-800">
                    Color
                  </th>
                  {sizes.map((size) => (
                    <th
                      key={size}
                      className="border-b border-slate-200 px-2 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800"
                    >
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {colors.map((color) => (
                  <tr key={color}>
                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">
                      {color}
                    </td>
                    {sizes.map((size) => {
                      const item = cellFor(color, size)
                      return (
                        <td key={size} className="px-2 py-2">
                          {item ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-slate-400">{item.quantity} on hand</span>
                              <QuantityInput
                                max={item.quantity}
                                disabled={item.quantity === 0}
                                value={deltas[item.id] ?? ''}
                                onChange={handleDeltaChange(item.id)}
                                placeholder="0"
                                title={item.sku}
                                ariaLabel={`Amount used for ${item.sku}`}
                                accent="red"
                                invalid={rawUsage(item) > item.quantity}
                                dense
                              />
                            </div>
                          ) : (
                            <span className="flex justify-center text-slate-300 dark:text-slate-700">
                              &mdash;
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const label = [item.brand, item.color, item.size].filter(Boolean).join(' / ')
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {label || item.sku}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} on hand &middot; {item.sku}
                    </p>
                  </div>
                  <QuantityInput
                    max={item.quantity}
                    disabled={item.quantity === 0}
                    value={deltas[item.id] ?? ''}
                    onChange={handleDeltaChange(item.id)}
                    placeholder="0"
                    ariaLabel={`Amount used for ${label || item.sku}`}
                    accent="red"
                    invalid={rawUsage(item) > item.quantity}
                    dense
                  />
                </div>
              )
            })}
          </div>
        )}

        {isGroup && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-950">
            <span className="text-slate-600 dark:text-slate-300">
              Total to use:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {totalToUse} {first.unit ?? ''}
              </span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">{parsedUsages.length}</span>{' '}
              variant{parsedUsages.length === 1 ? '' : 's'} affected
            </span>
          </div>
        )}

        {overLimitItems.length > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Not enough on hand for{' '}
            {overLimitItems.map((item) => [item.color, item.size].filter(Boolean).join(' ') || item.sku).join(', ')}.
          </p>
        )}

        {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
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
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Use Stock
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UseStockModal
