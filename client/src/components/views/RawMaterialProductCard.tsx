import { ImageOff, PackageMinus, PackagePlus, Pencil, Trash2 } from 'lucide-react'
import { categoryColor } from '../../lib/categoryColor'
import { cldThumb } from '../../lib/cloudinaryImage'
import { analyzeVariantGroup } from '../../lib/variantMatrix'
import type { RawMaterial } from '../../types/api'

interface RawMaterialProductCardProps {
  items: RawMaterial[]
  onEdit: (item: RawMaterial) => void
  onRestock: (items: RawMaterial[]) => void
  onUse: (items: RawMaterial[]) => void
  onDeleteRequest: (items: RawMaterial[]) => void
}

const editButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const restockButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const useButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const deleteButtonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const quantityPillClass =
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'

function RawMaterialProductCard({ items, onEdit, onRestock, onUse, onDeleteRequest }: RawMaterialProductCardProps) {
  const first = items[0]!
  const isGroup = items.length > 1
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtitle = [first.brand, first.styleNumber].filter(Boolean).join(' · ')
  const dot = categoryColor(first.category.name).dot

  const { matrixReady, colors, sizes } = analyzeVariantGroup(items)
  const cellFor = (color: string, size: string) =>
    items.find((item) => item.color === color && item.size === size)

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-3 p-4">
        {first.imageUrl ? (
          <img
            src={cldThumb(first.imageUrl, 96)}
            alt={first.name}
            className="size-11 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
            <ImageOff className="size-4" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900 dark:text-slate-100">{first.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            {subtitle && <span>{subtitle} &middot;</span>}
            <span className={`size-1.5 rounded-full ${dot}`} />
            {first.category.name}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isGroup && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {items.length} variants
            </span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${quantityPillClass}`}>
            {totalQuantity} {first.unit ?? ''}
          </span>
          {!isGroup && first.pricePerUnit !== null && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              ${first.pricePerUnit.toFixed(2)}/pc
            </span>
          )}
          {!isGroup && first.courierFee !== null && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              +${first.courierFee.toFixed(2)} courier
            </span>
          )}
          <button type="button" onClick={() => onRestock(items)} className={restockButtonClass}>
            <PackagePlus className="size-3.5" />
            Restock
          </button>
          <button
            type="button"
            onClick={() => onUse(items)}
            disabled={totalQuantity === 0}
            className={`${useButtonClass} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-600 dark:disabled:hover:text-slate-300`}
          >
            <PackageMinus className="size-3.5" />
            Use
          </button>
          {!isGroup && (
            <button type="button" onClick={() => onEdit(first)} className={editButtonClass}>
              <Pencil className="size-3.5" />
              Edit
            </button>
          )}
          <button type="button" onClick={() => onDeleteRequest(items)} className={deleteButtonClass}>
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </div>

      {isGroup && matrixReady && (
        <div className="overflow-x-auto border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="pb-2 pr-4 text-left text-xs font-medium text-slate-500">Color</th>
                {sizes.map((size) => (
                  <th
                    key={size}
                    className="px-2 pb-2 text-center text-xs font-medium text-slate-500"
                  >
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color}>
                  <td className="py-1 pr-4 font-medium text-slate-700 dark:text-slate-200">
                    {color}
                  </td>
                  {sizes.map((size) => {
                    const item = cellFor(color, size)
                    if (!item) {
                      return (
                        <td
                          key={size}
                          className="px-2 py-1 text-center text-slate-300 dark:text-slate-700"
                        >
                          &mdash;
                        </td>
                      )
                    }
                    return (
                      <td key={size} className="px-1 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title={item.sku}
                          className="min-w-11 rounded-md px-2 py-1 text-sm font-semibold tabular-nums text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {item.quantity}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isGroup && !matrixReady && (
        <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {items.map((item) => {
            const itemVariant = [item.brand, item.color, item.size].filter(Boolean).join(' / ')
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="min-w-0 truncate text-xs text-slate-500">
                  {itemVariant || item.sku} &middot; {item.sku}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${quantityPillClass}`}>
                    {item.quantity} {item.unit ?? ''}
                  </span>
                  {item.pricePerUnit !== null && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      ${item.pricePerUnit.toFixed(2)}/pc
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Edit ${item.sku}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-700 dark:text-slate-500 dark:hover:bg-slate-800"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RawMaterialProductCard
