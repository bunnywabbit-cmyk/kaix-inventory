import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cellKey, SIZE_ORDER } from '../../lib/variantMatrix'
import PriceInput from '../ui/PriceInput'

interface VariantMatrixProps {
  colors: string[]
  sizes: string[]
  onSizesChange: (sizes: string[]) => void
  quantities: Record<string, number>
  onQuantityChange: (color: string, size: string, value: number) => void
  skuFor: (color: string, size: string) => string
  onRemoveColor: (color: string) => void
  /** Price per piece, keyed by cellKey(color, size) — each colorway/size combo can have its own price. */
  pricesByVariant: Record<string, string>
  onPriceChange: (color: string, size: string, value: string) => void
  courierFee: string
  onCourierFeeChange: (value: string) => void
}

function VariantMatrix({
  colors,
  sizes,
  onSizesChange,
  quantities,
  onQuantityChange,
  skuFor,
  onRemoveColor,
  pricesByVariant,
  onPriceChange,
  courierFee,
  onCourierFeeChange,
}: VariantMatrixProps) {
  const [fillValues, setFillValues] = useState<Record<string, string>>({})
  const [fillPrices, setFillPrices] = useState<Record<string, string>>({})

  const toggleSize = (size: string) => {
    onSizesChange(sizes.includes(size) ? sizes.filter((s) => s !== size) : [...sizes, size])
  }

  const handleFillRow = (color: string) => {
    const value = Math.max(0, Number(fillValues[color]) || 0)
    sizes.forEach((size) => onQuantityChange(color, size, value))
  }

  const handleFillPriceRow = (color: string) => {
    const value = Math.max(0, Number(fillPrices[color]) || 0).toFixed(2)
    sizes.forEach((size) => onPriceChange(color, size, value))
  }

  const { totalItems, variantCount } = useMemo(() => {
    let total = 0
    let count = 0
    for (const color of colors) {
      for (const size of sizes) {
        const qty = quantities[cellKey(color, size)] ?? 0
        if (qty > 0) {
          total += qty
          count += 1
        }
      }
    }
    return { totalItems: total, variantCount: count }
  }, [colors, sizes, quantities])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Sizes</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SIZE_ORDER.map((size) => {
              const active = sizes.includes(size)
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500" htmlFor="vm-courier-fee">
            Courier Fee <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <PriceInput
            id="vm-courier-fee"
            value={courierFee}
            onChange={onCourierFeeChange}
            dense
            className="mt-1.5 w-32"
          />
        </div>
      </div>

      {colors.length === 0 || sizes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:text-slate-600">
          Add at least one color and one size to build the stock matrix.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-500 dark:border-slate-800">
                    Color
                  </th>
                  {sizes.map((size) => (
                    <th
                      key={size}
                      className="w-24 border-b border-slate-200 px-2 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800"
                    >
                      {size}
                    </th>
                  ))}
                  <th className="w-36 border-b border-slate-200 px-2 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800">
                    Quick Fill
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {colors.map((color) => (
                  <tr key={color}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {color}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveColor(color)}
                          aria-label={`Remove ${color} row`}
                          className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    {sizes.map((size) => {
                      const key = cellKey(color, size)
                      const qty = quantities[key] ?? 0
                      return (
                        <td key={size} className="w-24 px-2 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <PriceInput
                              id={`vm-price-${key}`}
                              value={pricesByVariant[key] ?? ''}
                              onChange={(value) => onPriceChange(color, size, value)}
                              ariaLabel={`Price per piece for ${color} ${size}`}
                              dense
                              className="w-16"
                            />
                            <input
                              type="number"
                              min={0}
                              value={qty || ''}
                              onChange={(event) =>
                                onQuantityChange(
                                  color,
                                  size,
                                  Math.max(0, Number(event.target.value) || 0),
                                )
                              }
                              placeholder="0"
                              title={skuFor(color, size)}
                              className={`w-16 rounded-md border px-2 py-1.5 text-center text-sm font-semibold tabular-nums outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 ${
                                qty > 0
                                  ? 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
                                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                              }`}
                            />
                          </div>
                        </td>
                      )
                    })}
                    <td className="w-36 px-2 py-2">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <PriceInput
                            id={`vm-fillprice-${color}`}
                            value={fillPrices[color] ?? ''}
                            onChange={(value) =>
                              setFillPrices((prev) => ({ ...prev, [color]: value }))
                            }
                            ariaLabel={`Fill price for ${color}`}
                            dense
                            className="w-16"
                          />
                          <button
                            type="button"
                            onClick={() => handleFillPriceRow(color)}
                            className="whitespace-nowrap rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Fill
                          </button>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={fillValues[color] ?? ''}
                            onChange={(event) =>
                              setFillValues((prev) => ({ ...prev, [color]: event.target.value }))
                            }
                            placeholder="N"
                            aria-label={`Fill quantity for ${color}`}
                            className="w-16 rounded-md border border-slate-200 px-1.5 py-1.5 text-center text-xs outline-none focus:border-sky-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleFillRow(color)}
                            className="whitespace-nowrap rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Fill
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-sm dark:bg-slate-950">
            <span className="text-slate-600 dark:text-slate-300">
              Total New Items:{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {totalItems.toLocaleString()} pcs
              </span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">{variantCount}</span> SKU
              variant{variantCount === 1 ? '' : 's'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default VariantMatrix
