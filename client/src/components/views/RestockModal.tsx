import { Loader2 } from 'lucide-react'
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { generateVariantSku } from '../../lib/skuGenerator'
import { analyzeVariantGroup, cellKey, SIZE_ORDER, sortSizes } from '../../lib/variantMatrix'
import type { RawMaterial } from '../../types/api'
import Modal from '../ui/Modal'

interface RestockModalProps {
  items: RawMaterial[]
  onClose: () => void
  onSuccess: (message: string, updatedItems: RawMaterial[]) => void
}

const deltaInputClass =
  'w-16 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold tabular-nums outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'

function RestockModal({ items, onClose, onSuccess }: RestockModalProps) {
  const first = items[0]!
  const isGroup = items.length > 1
  const { matrixReady, colors, sizes: existingSizes } = useMemo(
    () => analyzeVariantGroup(items),
    [items],
  )
  const cellFor = (color: string, size: string) =>
    items.find((item) => item.color === color && item.size === size)

  const [extraSizes, setExtraSizes] = useState<string[]>([])
  const sizes = useMemo(
    () => sortSizes([...new Set([...existingSizes, ...extraSizes])]),
    [existingSizes, extraSizes],
  )

  const toggleExtraSize = (size: string) => {
    if (existingSizes.includes(size)) return
    setExtraSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]))
  }

  // Existing variants: delta to add, keyed by item id.
  const [deltas, setDeltas] = useState<Record<string, string>>({})
  // Color/size combos with no variant yet: initial quantity, keyed by "color::size".
  const [newQuantities, setNewQuantities] = useState<Record<string, string>>({})

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleDeltaChange = (id: string) => (event: ChangeEvent<HTMLInputElement>) =>
    setDeltas((prev) => ({ ...prev, [id]: event.target.value }))
  const handleNewQuantityChange = (key: string) => (event: ChangeEvent<HTMLInputElement>) =>
    setNewQuantities((prev) => ({ ...prev, [key]: event.target.value }))

  const parsedAdjustments = useMemo(
    () =>
      items
        .map((item) => ({ item, delta: Math.max(0, Math.trunc(Number(deltas[item.id]) || 0)) }))
        .filter((entry) => entry.delta > 0),
    [items, deltas],
  )

  const parsedNewVariants = useMemo(() => {
    if (!matrixReady) return []
    const result: { color: string; size: string; quantity: number }[] = []
    for (const color of colors) {
      for (const size of sizes) {
        const hasVariant = items.some((item) => item.color === color && item.size === size)
        if (hasVariant) continue
        const quantity = Math.max(0, Math.trunc(Number(newQuantities[cellKey(color, size)]) || 0))
        if (quantity > 0) result.push({ color, size, quantity })
      }
    }
    return result
  }, [matrixReady, colors, sizes, newQuantities, items])

  const totalToAdd =
    parsedAdjustments.reduce((sum, entry) => sum + entry.delta, 0) +
    parsedNewVariants.reduce((sum, entry) => sum + entry.quantity, 0)
  const affectedCount = parsedAdjustments.length + parsedNewVariants.length
  const canSubmit = affectedCount > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setFormError('Enter an amount for at least one item.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const results: RawMaterial[] = []

      if (parsedNewVariants.length > 0) {
        const created = await api.post<RawMaterial[]>('/raw-materials/batch', {
          items: parsedNewVariants.map((variant) => ({
            name: first.name,
            sku: generateVariantSku(first.brand ?? '', first.styleNumber ?? '', variant.color, variant.size),
            categoryId: first.categoryId,
            quantity: variant.quantity,
            brand: first.brand ?? undefined,
            styleNumber: first.styleNumber ?? undefined,
            color: variant.color,
            size: variant.size,
            unit: first.unit ?? undefined,
            imageUrl: first.imageUrl ?? undefined,
          })),
        })
        results.push(...created)
      }

      if (parsedAdjustments.length > 0) {
        const adjustments = parsedAdjustments.map(({ item, delta }) => ({ id: item.id, delta }))
        const updated = await api.post<RawMaterial[]>('/raw-materials/adjust-stock-batch', {
          adjustments,
        })
        results.push(...updated)
      }

      const label = isGroup
        ? `${affectedCount} variant${affectedCount === 1 ? '' : 's'} of ${first.name}`
        : first.name
      onSuccess(`Restocked ${label} (+${totalToAdd} ${first.unit ?? ''}).`.trim(), results)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Restock ${first.name}`} onClose={onClose} size={isGroup ? 'xl' : 'md'}>
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
              <label className="text-xs font-medium text-slate-500" htmlFor="restock-amount">
                Amount to Add
              </label>
              <input
                id="restock-amount"
                type="number"
                min={0}
                autoFocus
                value={deltas[first.id] ?? ''}
                onChange={handleDeltaChange(first.id)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        ) : matrixReady ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Sizes</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SIZE_ORDER.map((size) => {
                  const isExisting = existingSizes.includes(size)
                  const active = isExisting || extraSizes.includes(size)
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isExisting}
                      onClick={() => toggleExtraSize(size)}
                      title={isExisting ? 'Already stocked in this size' : undefined}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? isExisting
                            ? 'cursor-default border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </div>

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
                        const key = cellKey(color, size)
                        return (
                          <td key={size} className="px-2 py-2">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-slate-400">
                                {item ? `${item.quantity} on hand` : 'not stocked'}
                              </span>
                              {item ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={deltas[item.id] ?? ''}
                                  onChange={handleDeltaChange(item.id)}
                                  placeholder="0"
                                  title={item.sku}
                                  className={deltaInputClass}
                                />
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  value={newQuantities[key] ?? ''}
                                  onChange={handleNewQuantityChange(key)}
                                  placeholder="0"
                                  title={`New: ${generateVariantSku(first.brand ?? '', first.styleNumber ?? '', color, size)}`}
                                  className={`${deltaInputClass} border-dashed`}
                                />
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  <input
                    type="number"
                    min={0}
                    value={deltas[item.id] ?? ''}
                    onChange={handleDeltaChange(item.id)}
                    placeholder="0"
                    className={deltaInputClass}
                  />
                </div>
              )
            })}
          </div>
        )}

        {isGroup && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-950">
            <span className="text-slate-600 dark:text-slate-300">
              Total to add:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {totalToAdd} {first.unit ?? ''}
              </span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">{affectedCount}</span>{' '}
              variant{affectedCount === 1 ? '' : 's'} affected
              {parsedNewVariants.length > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {' '}
                  ({parsedNewVariants.length} new)
                </span>
              )}
            </span>
          </div>
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
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Restock
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default RestockModal
