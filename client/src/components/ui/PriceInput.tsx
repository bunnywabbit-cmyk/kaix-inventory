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
  const paddingClass = dense ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'

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
    <div
      className={`flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 ${className}`}
    >
      <span
        className={`flex shrink-0 items-center border-r border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 ${paddingClass}`}
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
        className={`w-full min-w-0 bg-transparent text-slate-900 outline-none dark:text-slate-100 ${paddingClass} ${noSpinnerClass}`}
      />
    </div>
  )
}

export default PriceInput
