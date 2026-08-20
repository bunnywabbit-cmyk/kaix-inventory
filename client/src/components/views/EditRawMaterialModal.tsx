import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useCategories } from '../../hooks/useInventory'
import { useMaterialPhoto } from '../../hooks/useMaterialPhoto'
import { api } from '../../lib/api'
import { invalidInputClass } from '../../lib/formValidation'
import type { RawMaterial } from '../../types/api'
import MaterialPhotoField from '../ui/MaterialPhotoField'
import Modal from '../ui/Modal'
import PriceInput from '../ui/PriceInput'

interface EditRawMaterialModalProps {
  material: RawMaterial
  onClose: () => void
  onSuccess: (message: string) => void
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const inputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`
const labelClass = 'text-xs font-medium text-slate-500'

function EditRawMaterialModal({ material, onClose, onSuccess }: EditRawMaterialModalProps) {
  const { data: categories } = useCategories()

  const [name, setName] = useState(material.name)
  const [sku, setSku] = useState(material.sku)
  const [categoryId, setCategoryId] = useState(material.categoryId)
  const [quantity, setQuantity] = useState(String(material.quantity))
  const [brand, setBrand] = useState(material.brand ?? '')
  const [styleNumber, setStyleNumber] = useState(material.styleNumber ?? '')
  const [color, setColor] = useState(material.color ?? '')
  const [size, setSize] = useState(material.size ?? '')
  const [unit, setUnit] = useState(material.unit ?? '')
  const [pricePerUnit, setPricePerUnit] = useState(
    material.pricePerUnit !== null ? String(material.pricePerUnit) : '',
  )
  const [courierFee, setCourierFee] = useState(
    material.courierFee !== null ? String(material.courierFee) : '',
  )

  const photo = useMaterialPhoto(material.imageUrl)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const canSubmit = Boolean(name.trim() && sku.trim() && categoryId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const finalImageUrl = await photo.resolveImageUrl()

      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        categoryId,
        quantity: Math.max(0, Number(quantity) || 0),
        brand: brand.trim() || undefined,
        styleNumber: styleNumber.trim() || undefined,
        color: color.trim() || undefined,
        size: size.trim() || undefined,
        unit: unit.trim() || undefined,
        pricePerUnit: pricePerUnit.trim() ? Number(pricePerUnit) : null,
        courierFee: courierFee.trim() ? Number(courierFee) : null,
        imageUrl: finalImageUrl,
      }

      await api.patch(`/raw-materials/${material.id}`, payload)
      onSuccess(`Updated ${payload.name}.`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Edit Raw Material" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rm-name">
              Name
            </label>
            <input
              id="rm-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Gildan 5000 Blank Tee"
              className={attempted && !name.trim() ? inputClassInvalid : inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rm-sku">
              SKU
            </label>
            <input
              id="rm-sku"
              type="text"
              required
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="e.g. GIL5000-BLK-L"
              className={attempted && !sku.trim() ? inputClassInvalid : inputClass}
            />
          </div>
        </div>

        <MaterialPhotoField
          previewSrc={photo.previewSrc}
          onFileChange={photo.handleFileChange}
          onRemove={photo.handleRemove}
        />

        <div>
          <label className={labelClass} htmlFor="rm-category">
            Category
          </label>
          <select
            id="rm-category"
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
            <label className={labelClass} htmlFor="rm-quantity">
              Quantity
            </label>
            <input
              id="rm-quantity"
              type="number"
              min={0}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rm-unit">
              Unit
            </label>
            <input
              id="rm-unit"
              type="text"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="pieces, quarts..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rm-brand">
              Brand
            </label>
            <input
              id="rm-brand"
              type="text"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rm-style">
              Style #
            </label>
            <input
              id="rm-style"
              type="text"
              value={styleNumber}
              onChange={(event) => setStyleNumber(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rm-price">
              Price per Piece <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <PriceInput
              id="rm-price"
              value={pricePerUnit}
              onChange={setPricePerUnit}
              className="mt-1"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rm-courier-fee">
              Courier Fee <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <PriceInput
              id="rm-courier-fee"
              value={courierFee}
              onChange={setCourierFee}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="rm-color">
              Color
            </label>
            <input
              id="rm-color"
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rm-size">
              Size
            </label>
            <input
              id="rm-size"
              type="text"
              value={size}
              onChange={(event) => setSize(event.target.value)}
              className={inputClass}
            />
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
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default EditRawMaterialModal
