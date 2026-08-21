import { type ChangeEvent, type FocusEvent } from 'react'

interface PriceInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Tighter padding/text size for inline use (e.g. a table cell). */
  dense?: boolean
  /** Applied to the outer wrapper — width, margin, etc. */
  className?: string
  ariaLabel?: string
}

// Hides the native up/down spinner (quantity fields keep theirs — this is
// price-only) while leaving the input otherwise untouched.
const noSpinnerClass =
  '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'

function PriceInput({
  id,
  value,
  onChange,
  placeholder = '0.00',
  dense = false,
  className = '',
  ariaLabel,
}: PriceInputProps) {
  const paddingClass = dense ? 'py-1.5 pl-5 pr-2 text-xs' : 'py-2 pl-7 pr-3 text-sm'
  const signClass = dense ? 'pl-2 text-xs' : 'pl-3 text-sm'

  // Snaps to two decimal places once the user leaves the field, rather than
  // fighting their typing (e.g. "5." or "5.5") on every keystroke.
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim()
    if (!raw) return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onChange(Math.max(0, parsed).toFixed(2))
  }

  return (
    <div className={`relative ${className}`}>
      <span
        className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-slate-500 dark:text-slate-400 ${signClass}`}
      >
        &#8369;
      </span>
      <input
        id={id}
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`w-full rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 ${paddingClass} ${noSpinnerClass}`}
      />
    </div>
  )
}

export default PriceInput
