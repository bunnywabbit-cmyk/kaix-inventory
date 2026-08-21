import { Loader2, Package, Shirt } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useCategories } from '../../hooks/useInventory'
import { useMaterialPhoto } from '../../hooks/useMaterialPhoto'
import { api } from '../../lib/api'
import { invalidInputClass } from '../../lib/formValidation'
import { FIT_STYLE_OPTIONS, generateSupplySku, generateVariantSku } from '../../lib/skuGenerator'
import { cellKey } from '../../lib/variantMatrix'
import type { RawMaterial } from '../../types/api'
import MaterialPhotoField from '../ui/MaterialPhotoField'
import Modal from '../ui/Modal'
import PriceInput from '../ui/PriceInput'
import ColorTagInput from './ColorTagInput'
import VariantMatrix from './VariantMatrix'

type ItemType = 'apparel' | 'supply'

interface AddMaterialModalProps {
  onClose: () => void
  onSuccess: (message: string, createdItems: RawMaterial[]) => void
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const inputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`
const labelClass = 'text-xs font-medium text-slate-500'

function AddMaterialModal({ onClose, onSuccess }: AddMaterialModalProps) {
  const { data: categories } = useCategories()
  const [itemType, setItemType] = useState<ItemType>('apparel')
  const [categoryId, setCategoryId] = useState('')
  const photo = useMaterialPhoto()

  // Standard Supply / Consumable fields
  const [supplyName, setSupplyName] = useState('')
  const [supplySku, setSupplySku] = useState('')
  const [supplyQuantity, setSupplyQuantity] = useState('0')
  const [supplyUnit, setSupplyUnit] = useState('')
  const [supplyPricePerUnit, setSupplyPricePerUnit] = useState('')
  const [supplyCourierFee, setSupplyCourierFee] = useState('')

  // Blank Apparel fields
  const [brand, setBrand] = useState('')
  const [style, setStyle] = useState('')
  const [baseName, setBaseName] = useState('')
  const [colors, setColors] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  // Keyed by cellKey(color, size) — each colorway/size combo can have its own price.
  const [pricesByVariant, setPricesByVariant] = useState<Record<string, string>>({})
  // Courier fee is for the whole restock order, so it stays a single value
  // applied to every variant created from this batch.
  const [apparelCourierFee, setApparelCourierFee] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  // Default the category to "Blank Apparel" once categories load, for apparel mode.
  useEffect(() => {
    if (itemType !== 'apparel' || categoryId || !categories) return
    const blankApparel = categories.find((c) => c.name.toLowerCase() === 'blank apparel')
    if (blankApparel) setCategoryId(blankApparel.id)
  }, [itemType, categories, categoryId])

  const handleItemTypeChange = (next: ItemType) => {
    setItemType(next)
    setCategoryId('')
    setFormError(null)
    setAttempted(false)
  }

  const handleQuantityChange = (color: string, size: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [cellKey(color, size)]: value }))
  }

  const handlePriceChange = (color: string, size: string, value: string) => {
    setPricesByVariant((prev) => ({ ...prev, [cellKey(color, size)]: value }))
  }

  const handleRemoveColor = (color: string) => {
    setColors((prev) => prev.filter((c) => c !== color))
    setQuantities((prev) => {
      const next = { ...prev }
      for (const size of sizes) delete next[cellKey(color, size)]
      return next
    })
    setPricesByVariant((prev) => {
      const next = { ...prev }
      for (const size of sizes) delete next[cellKey(color, size)]
      return next
    })
  }

  const skuFor = (color: string, size: string) => generateVariantSku(brand, style, color, size)

  const supplyValid = Boolean(supplyName.trim() && categoryId)
  const apparelHasStock = Object.values(quantities).some((qty) => qty > 0)
  const apparelValid = Boolean(
    brand.trim() && style && baseName.trim() && categoryId && colors.length > 0 && sizes.length > 0 && apparelHasStock,
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (itemType === 'supply') {
      if (!supplyValid) {
        setAttempted(true)
        setFormError('Fill in the highlighted fields before saving.')
        return
      }
      setSubmitting(true)
      try {
        const imageUrl = await photo.resolveImageUrl()
        const payload = {
          name: supplyName.trim(),
          sku: supplySku.trim() || generateSupplySku(supplyName.trim()),
          categoryId,
          quantity: Math.max(0, Number(supplyQuantity) || 0),
          unit: supplyUnit.trim() || undefined,
          pricePerUnit: supplyPricePerUnit.trim() ? Number(supplyPricePerUnit) : undefined,
          courierFee: supplyCourierFee.trim() ? Number(supplyCourierFee) : undefined,
          imageUrl,
        }
        const created = await api.post<RawMaterial>('/raw-materials', payload)
        onSuccess(`Added ${created.name}.`, [created])
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Something went wrong.')
        setSubmitting(false)
      }
      return
    }

    if (!apparelValid) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }
    setSubmitting(true)

    try {
      const imageUrl = await photo.resolveImageUrl()
      const items = colors.flatMap((color) =>
        sizes
          .map((size) => ({ color, size, quantity: quantities[cellKey(color, size)] ?? 0 }))
          .filter((variant) => variant.quantity > 0)
          .map((variant) => ({
            name: baseName.trim(),
            sku: skuFor(color, variant.size),
            categoryId,
            quantity: variant.quantity,
            brand: brand.trim(),
            styleNumber: style,
            color: variant.color,
            size: variant.size,
            unit: 'pieces',
            pricePerUnit: pricesByVariant[cellKey(variant.color, variant.size)]?.trim()
              ? Number(pricesByVariant[cellKey(variant.color, variant.size)])
              : undefined,
            courierFee: apparelCourierFee.trim() ? Number(apparelCourierFee) : undefined,
            imageUrl,
          })),
      )

      const created = await api.post<RawMaterial[]>('/raw-materials/batch', { items })
      const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)
      onSuccess(
        `Added ${created.length} variant${created.length === 1 ? '' : 's'} of ${baseName.trim()} (${totalUnits} pcs).`,
        created,
      )
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Raw Material" onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => handleItemTypeChange('apparel')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              itemType === 'apparel'
                ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Shirt className="size-4" />
            Blank Apparel
          </button>
          <button
            type="button"
            onClick={() => handleItemTypeChange('supply')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              itemType === 'supply'
                ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Package className="size-4" />
            Standard Supply / Consumable
          </button>
        </div>

        {itemType === 'supply' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="sm-name">
                  Name
                </label>
                <input
                  id="sm-name"
                  type="text"
                  required
                  value={supplyName}
                  onChange={(event) => setSupplyName(event.target.value)}
                  placeholder="e.g. Union Black Plastisol Ink"
                  className={attempted && !supplyName.trim() ? inputClassInvalid : inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sm-sku">
                  SKU <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="sm-sku"
                  type="text"
                  value={supplySku}
                  onChange={(event) => setSupplySku(event.target.value)}
                  placeholder="Auto-generated if left blank"
                  className={inputClass}
                />
              </div>
            </div>

            <MaterialPhotoField
              previewSrc={photo.previewSrc}
              onFileChange={photo.handleFileChange}
              onRemove={photo.handleRemove}
            />

            <div>
              <label className={labelClass} htmlFor="sm-category">
                Category
              </label>
              <select
                id="sm-category"
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={attempted && !categoryId ? inputClassInvalid : inputClass}
              >
                <option value="" disabled>
                  Select a category...
                </option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="sm-quantity">
                  Quantity
                </label>
                <input
                  id="sm-quantity"
                  type="number"
                  min={0}
                  value={supplyQuantity}
                  onChange={(event) => setSupplyQuantity(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sm-unit">
                  Unit
                </label>
                <input
                  id="sm-unit"
                  type="text"
                  value={supplyUnit}
                  onChange={(event) => setSupplyUnit(event.target.value)}
                  placeholder="pieces, quarts..."
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="sm-price">
                  Price per Piece <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <PriceInput
                  id="sm-price"
                  value={supplyPricePerUnit}
                  onChange={setSupplyPricePerUnit}
                  className="mt-1"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sm-courier-fee">
                  Courier Fee <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <PriceInput
                  id="sm-courier-fee"
                  value={supplyCourierFee}
                  onChange={setSupplyCourierFee}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Step 1 &middot; Base Details
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="am-brand">
                    Brand
                  </label>
                  <input
                    id="am-brand"
                    type="text"
                    required
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="e.g. Gildan"
                    className={attempted && !brand.trim() ? inputClassInvalid : inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="am-style">
                    Style
                  </label>
                  <select
                    id="am-style"
                    required
                    value={style}
                    onChange={(event) => setStyle(event.target.value)}
                    className={attempted && !style ? inputClassInvalid : inputClass}
                  >
                    <option value="" disabled>
                      Select a style...
                    </option>
                    {FIT_STYLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="am-base-name">
                    Base Name
                  </label>
                  <input
                    id="am-base-name"
                    type="text"
                    required
                    value={baseName}
                    onChange={(event) => setBaseName(event.target.value)}
                    placeholder="e.g. Heavy Cotton Short Sleeve Tee"
                    className={attempted && !baseName.trim() ? inputClassInvalid : inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="am-category">
                    Category
                  </label>
                  <select
                    id="am-category"
                    required
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className={attempted && !categoryId ? inputClassInvalid : inputClass}
                  >
                    <option value="" disabled>
                      Select a category...
                    </option>
                    {(categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <MaterialPhotoField
                  previewSrc={photo.previewSrc}
                  onFileChange={photo.handleFileChange}
                  onRemove={photo.handleRemove}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Step 2 &middot; Colors
                </p>
                <div
                  className={`mt-2 rounded-lg ${
                    attempted && colors.length === 0 ? 'ring-1 ring-red-500' : ''
                  }`}
                >
                  <ColorTagInput colors={colors} onChange={setColors} />
                </div>
                {attempted && colors.length === 0 && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Add at least one color.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Step 3 &middot; Stock Matrix
              </p>
              <div
                className={`mt-2 rounded-lg ${
                  attempted && (sizes.length === 0 || !apparelHasStock) ? 'ring-1 ring-red-500' : ''
                }`}
              >
                <VariantMatrix
                  colors={colors}
                  sizes={sizes}
                  onSizesChange={setSizes}
                  quantities={quantities}
                  onQuantityChange={handleQuantityChange}
                  skuFor={skuFor}
                  onRemoveColor={handleRemoveColor}
                  pricesByVariant={pricesByVariant}
                  onPriceChange={handlePriceChange}
                  courierFee={apparelCourierFee}
                  onCourierFeeChange={setApparelCourierFee}
                />
              </div>
              {attempted && sizes.length > 0 && !apparelHasStock && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Enter a quantity for at least one color/size.
                </p>
              )}
            </div>
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
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {itemType === 'supply' ? 'Add Material' : 'Add Variants to Inventory'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AddMaterialModal
