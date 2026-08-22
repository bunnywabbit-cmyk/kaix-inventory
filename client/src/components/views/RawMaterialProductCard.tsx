import { ImageOff, PackageMinus, PackagePlus, Pencil, Trash2 } from 'lucide-react'
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

// justify-center matters once these sit in the mobile action grid below,
// where each button stretches to fill an equal-width cell — without it the
// icon would hug the left edge of that now-wider box instead of staying
// centered. It's a no-op everywhere else these are used (desktop, and any
// other shrink-to-fit context), since the box already matches its content
// there.
const editButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const restockButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const useButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const deleteButtonClass =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'

const quantityPillClass =
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'

function RawMaterialProductCard({ items, onEdit, onRestock, onUse, onDeleteRequest }: RawMaterialProductCardProps) {
  const first = items[0]!
  const isGroup = items.length > 1
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const { matrixReady, colors, sizes } = analyzeVariantGroup(items)
  const cellFor = (color: string, size: string) =>
    items.find((item) => item.color === color && item.size === size)

  const image = first.imageUrl ? (
    <img
      src={cldThumb(first.imageUrl, 96)}
      alt={first.name}
      className="size-11 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
    />
  ) : (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
      <ImageOff className="size-4" />
    </div>
  )

  const pills = (
    <>
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
    </>
  )

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => onRestock(items)}
        aria-label={`Restock ${first.name}`}
        className={restockButtonClass}
      >
        <PackagePlus className="size-3.5" />
        <span className="hidden sm:inline">Restock</span>
      </button>
      <button
        type="button"
        onClick={() => onUse(items)}
        disabled={totalQuantity === 0}
        aria-label={`Use ${first.name}`}
        className={`${useButtonClass} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-600 dark:disabled:hover:text-slate-300`}
      >
        <PackageMinus className="size-3.5" />
        <span className="hidden sm:inline">Use</span>
      </button>
      {!isGroup && (
        <button
          type="button"
          onClick={() => onEdit(first)}
          aria-label={`Edit ${first.name}`}
          className={editButtonClass}
        >
          <Pencil className="size-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onDeleteRequest(items)}
        aria-label={`Delete ${first.name}`}
        className={deleteButtonClass}
      >
        <Trash2 className="size-3.5" />
        <span className="hidden sm:inline">Delete</span>
      </button>
    </>
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
      {/* Mobile: image + name on the left, quantity/variant pills stacked
          above the (icon-only) action buttons on the right. */}
      <div className="flex items-center justify-between gap-3 p-3 sm:hidden">
        <div className="flex min-w-0 items-center gap-3">
          {image}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {first.name}
            </p>
            <p className="truncate text-xs text-slate-500">{first.category.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1.5">{pills}</div>
          <div className="flex items-center justify-center gap-1">{actionButtons}</div>
        </div>
      </div>

      {/* Desktop / tablet: unchanged wrapping row. */}
      <div className="hidden flex-wrap items-center gap-3 p-4 sm:flex">
        {image}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{first.name}</p>
          <p className="truncate text-xs text-slate-500">{first.category.name}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {pills}
          {actionButtons}
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
