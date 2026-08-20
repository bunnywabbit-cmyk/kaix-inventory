import { ImageOff, ImagePlus, X } from 'lucide-react'
import { useId } from 'react'
import { invalidBoxClass } from '../../lib/formValidation'

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif'

interface MaterialPhotoFieldProps {
  previewSrc: string | null
  onFileChange: (file: File | null) => void
  onRemove: () => void
  label?: string
  accept?: string
  /** Highlights the empty-state box red — pass when a submit was attempted
   * without a photo and this field is required. */
  invalid?: boolean
}

function MaterialPhotoField({
  previewSrc,
  onFileChange,
  onRemove,
  label = 'Material Photo',
  accept = ACCEPTED_IMAGE_TYPES,
  invalid = false,
}: MaterialPhotoFieldProps) {
  const inputId = useId()

  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        {previewSrc ? (
          <div className="relative shrink-0">
            <img
              src={previewSrc}
              alt="Material preview"
              className="size-20 rounded-lg border border-slate-200 object-cover dark:border-slate-800"
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div
            className={`flex size-20 shrink-0 items-center justify-center rounded-lg border border-dashed text-slate-400 dark:text-slate-600 ${
              invalid ? invalidBoxClass : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <ImageOff className="size-6" />
          </div>
        )}
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ImagePlus className="size-3.5" />
          {previewSrc ? 'Change photo' : 'Upload photo'}
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={(event) => {
              onFileChange(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}

export default MaterialPhotoField
