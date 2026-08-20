import { X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

interface ColorTagInputProps {
  colors: string[]
  onChange: (colors: string[]) => void
}

const POPULAR_COLORS = ['White', 'Black', 'Navy', 'Heather Grey', 'Red']

function ColorTagInput({ colors, onChange }: ColorTagInputProps) {
  const [draft, setDraft] = useState('')

  const addColor = (raw: string) => {
    const value = raw.trim()
    if (!value) return
    if (colors.some((color) => color.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...colors, value])
    setDraft('')
  }

  const removeColor = (value: string) => {
    onChange(colors.filter((color) => color !== value))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addColor(draft)
    } else if (event.key === 'Backspace' && !draft && colors.length > 0) {
      removeColor(colors[colors.length - 1]!)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950">
        {colors.map((color) => (
          <span
            key={color}
            className="flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-500/15 dark:text-sky-300"
          >
            {color}
            <button
              type="button"
              onClick={() => removeColor(color)}
              aria-label={`Remove ${color}`}
              className="rounded-full hover:text-red-600 dark:hover:text-red-400"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          aria-label="Add a color"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addColor(draft)}
          placeholder={colors.length === 0 ? 'Type a color and press Enter...' : 'Add another...'}
          className="min-w-[120px] flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-400">Quick add:</span>
        {POPULAR_COLORS.map((color) => {
          const active = colors.some((existing) => existing.toLowerCase() === color.toLowerCase())
          return (
            <button
              key={color}
              type="button"
              disabled={active}
              onClick={() => addColor(color)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'cursor-default border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700'
                  : 'border-slate-200 text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {color}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ColorTagInput
