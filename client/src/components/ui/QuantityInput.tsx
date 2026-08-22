import { Minus, Plus } from 'lucide-react'

export type QuantityInputAccent = 'sky' | 'red' | 'emerald'

interface QuantityInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  /** Used to build the +/- buttons' aria-labels ("Decrease {ariaLabel}") and as the input's own aria-label. */
  ariaLabel?: string
  /** Compact sizing for table cells / tight rows, in place of the full-width form-field size. */
  dense?: boolean
  invalid?: boolean
  /** Matches the destructive/positive tone of the action this quantity belongs to (e.g. red for "use stock", emerald for "restock"). */
  accent?: QuantityInputAccent
  /** Marks a cell that already holds a non-zero value (e.g. a variant matrix cell someone has filled in) with the accent's tint, so it stands out from untouched cells at a glance. */
  highlighted?: boolean
  className?: string
  title?: string
}

const accentClasses: Record<QuantityInputAccent, { focus: string; button: string; highlight: string }> = {
  sky: {
    focus: 'focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30',
    button: 'hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/10 dark:hover:text-sky-400',
    highlight: 'border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10',
  },
  red: {
    focus: 'focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30',
    button: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400',
    highlight: 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10',
  },
  emerald: {
    focus: 'focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30',
    button:
      'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400',
    highlight: 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10',
  },
}

// Hides the native up/down spinner — this component supplies its own +/-
// buttons instead, so the browser's default would just be a redundant second
// (and inconsistently styled) set of controls.
const noSpinnerClass =
  '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'

// A quantity field with +/- steppers on either side — used everywhere the
// app asks for a count of something (stock quantities, sizes, screens
// needed), so nudging a value by one doesn't require selecting the field,
// typing, and re-deriving the new number by hand.
function QuantityInput({
  id,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  disabled = false,
  autoFocus,
  ariaLabel,
  dense = false,
  invalid = false,
  accent = 'sky',
  highlighted = false,
  className = '',
  title,
}: QuantityInputProps) {
  const parsed = Number(value)
  const current = Number.isFinite(parsed) ? parsed : 0

  const commit = (next: number) => {
    const clamped = Math.min(max ?? Infinity, Math.max(min, next))
    onChange(String(clamped))
  }

  const atMin = current <= min
  const atMax = max !== undefined && current >= max
  const accentStyle = accentClasses[accent]

  const buttonSizeClass = dense ? 'w-6' : 'w-9'
  const inputWidthClass = dense ? 'w-9' : 'flex-1'
  const heightClass = dense ? 'py-1' : 'py-2'
  const textSizeClass = dense ? 'text-xs' : 'text-sm'
  // Dense mode's buttons+input are all fixed-width (no flex-1 to soak up
  // slack), so without this a grid cell wider than that fixed content — e.g.
  // a column sized for a sibling field — stretches this box to fill it
  // (CSS Grid's default `justify-items: stretch`) and leaves a blank strip
  // of empty border/background hanging off the end of the buttons. `w-fit`
  // keeps the box sized to its own content no matter how much room the
  // container offers. Non-dense mode is meant to fill its container
  // (callers pass `w-full` via className for that), so it's left alone.
  const selfSizeClass = dense ? 'w-fit' : ''

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-lg border transition-colors ${selfSizeClass} ${
        invalid
          ? 'border-red-500 bg-white dark:border-red-500 dark:bg-slate-950'
          : highlighted
            ? `${accentStyle.highlight} ${accentStyle.focus}`
            : `border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${accentStyle.focus}`
      } ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || atMin}
        onClick={() => commit(current - step)}
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : 'Decrease quantity'}
        className={`flex shrink-0 items-center justify-center border-r border-slate-200 text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-500 ${buttonSizeClass} ${accentStyle.button}`}
      >
        <Minus className={dense ? 'size-3' : 'size-3.5'} />
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        title={title}
        className={`${inputWidthClass} min-w-0 bg-transparent text-center font-semibold tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${heightClass} ${textSizeClass} ${noSpinnerClass}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || atMax}
        onClick={() => commit(current + step)}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : 'Increase quantity'}
        className={`flex shrink-0 items-center justify-center border-l border-slate-200 text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-800 dark:text-slate-500 ${buttonSizeClass} ${accentStyle.button}`}
      >
        <Plus className={dense ? 'size-3' : 'size-3.5'} />
      </button>
    </div>
  )
}

export default QuantityInput
