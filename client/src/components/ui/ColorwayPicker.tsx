import { ChevronDown, ImageOff, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ColorwayPickerColorway {
  id: string
  colorwayName: string
  imageUrl: string
}

export interface ColorwayPickerDesign {
  id: string
  designName: string
  mainProductImage: string
  colorways: ColorwayPickerColorway[]
  /** The design's total colorway count before already-claimed ones were filtered
   * out, so the empty state can say *why* there's nothing to offer. */
  totalColorwayCount: number
}

interface ColorwayPickerProps {
  designs: ColorwayPickerDesign[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

interface PanelRect {
  top: number
  left: number
  width: number
}

export interface DesignOption {
  id: string
  designName: string
  mainProductImage: string
}

interface DesignSelectProps<T extends DesignOption> {
  designs: T[]
  value: string
  onChange: (id: string) => void
}

export function DesignSelect<T extends DesignOption>({ designs, value, onChange }: DesignSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = designs.find((design) => design.id === value) ?? null
  const filteredDesigns = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return designs
    return designs.filter((design) => design.designName.toLowerCase().includes(query))
  }, [designs, search])

  // Clearing the search on open (rather than on close) means the field is
  // always blank the moment it becomes visible, whichever way it was closed.
  const toggleOpen = () => {
    if (!open) setSearch('')
    setOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setPanelRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
    updatePosition()
    searchRef.current?.focus()

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        {selected ? (
          <>
            {selected.mainProductImage ? (
              <img
                src={selected.mainProductImage}
                alt=""
                className="size-8 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 dark:bg-slate-800">
                <ImageOff className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{selected.designName}</span>
          </>
        ) : (
          <span className="flex-1 truncate text-slate-400">Select a design...</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>

      {open &&
        panelRect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: panelRect.top, left: panelRect.left, width: panelRect.width }}
            className="z-50 flex max-h-72 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
            role="listbox"
          >
            <div className="relative shrink-0 border-b border-slate-200 p-1.5 dark:border-slate-800">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search designs..."
                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="overflow-y-auto py-1">
              {filteredDesigns.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">
                  {search.trim() ? `No designs match "${search.trim()}".` : 'No designs available.'}
                </p>
              )}
              {filteredDesigns.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => {
                    onChange(design.id)
                    setOpen(false)
                  }}
                  role="option"
                  aria-selected={design.id === value}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    design.id === value ? 'bg-sky-50 dark:bg-sky-500/10' : ''
                  }`}
                >
                  {design.mainProductImage ? (
                    <img
                      src={design.mainProductImage}
                      alt=""
                      className="size-8 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-800"
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                      <ImageOff className="size-3.5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                    {design.designName}
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

function ColorwayPicker({ designs, selectedIds, onChange }: ColorwayPickerProps) {
  const [browsingDesignId, setBrowsingDesignId] = useState(() => {
    // Land on whichever design the first already-selected colorway belongs to,
    // so editing a screen shows its relevant colorways right away.
    const firstSelected = selectedIds[0]
    return designs.find((design) => design.colorways.some((c) => c.id === firstSelected))?.id ?? ''
  })

  const colorwayLookup = useMemo(() => {
    const map = new Map<string, { colorwayName: string; imageUrl: string; designName: string }>()
    for (const design of designs) {
      for (const colorway of design.colorways) {
        map.set(colorway.id, {
          colorwayName: colorway.colorwayName,
          imageUrl: colorway.imageUrl,
          designName: design.designName,
        })
      }
    }
    return map
  }, [designs])

  // If everything gets cleared out from outside (e.g. reclaiming a screen wipes
  // its colorways), the "Select a design..." field should reset too instead of
  // continuing to show whatever was last browsed. Adjusted during render rather
  // than in an effect, per React's guidance for resetting state from props.
  const [prevSelectedCount, setPrevSelectedCount] = useState(selectedIds.length)
  if (selectedIds.length !== prevSelectedCount) {
    setPrevSelectedCount(selectedIds.length)
    if (selectedIds.length === 0) setBrowsingDesignId('')
  }

  const browsingDesign = designs.find((design) => design.id === browsingDesignId) ?? null

  const toggleColorway = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  // Once a design has nothing left to offer — either every colorway it has is
  // already claimed by another screen (so `colorways` arrives pre-filtered down to
  // empty), or every colorway it has is already picked for this screen — drop it
  // from the design list (except the one currently being browsed, so its trigger
  // label and "nothing left" message stay visible).
  const selectableDesigns = useMemo(
    () =>
      designs.filter((design) => {
        if (design.id === browsingDesignId) return true
        if (design.totalColorwayCount > 0 && design.colorways.length === 0) return false
        return !(
          design.colorways.length > 0 &&
          design.colorways.every((colorway) => selectedIds.includes(colorway.id))
        )
      }),
    [designs, browsingDesignId, selectedIds],
  )

  const availableColorways = browsingDesign
    ? browsingDesign.colorways.filter((colorway) => !selectedIds.includes(colorway.id))
    : []

  return (
    <div className="space-y-2">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const info = colorwayLookup.get(id)
            if (!info) return null
            return (
              <span
                key={id}
                className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 dark:border-slate-700"
              >
                {info.imageUrl ? (
                  <img
                    src={info.imageUrl}
                    alt=""
                    className="size-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800">
                    <ImageOff className="size-3" />
                  </span>
                )}
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {info.colorwayName}
                  <span className="text-slate-400"> · {info.designName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => toggleColorway(id)}
                  aria-label={`Remove ${info.colorwayName}`}
                  className="rounded-full text-slate-400 hover:text-red-500"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <DesignSelect
        designs={selectableDesigns}
        value={browsingDesignId}
        onChange={setBrowsingDesignId}
      />

      {browsingDesign && (
        <div className="flex flex-wrap gap-2">
          {browsingDesign.colorways.length === 0 ? (
            <p className="text-xs text-slate-400">
              {browsingDesign.totalColorwayCount === 0
                ? 'This design has no colorways yet.'
                : "This design's colorways are already linked to other screens."}
            </p>
          ) : availableColorways.length === 0 ? (
            <p className="text-xs text-slate-400">
              All of this design's colorways have been added.
            </p>
          ) : (
            availableColorways.map((colorway) => (
              <button
                key={colorway.id}
                type="button"
                onClick={() => toggleColorway(colorway.id)}
                className="flex items-center gap-2.5 rounded-full border border-slate-200 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {colorway.imageUrl ? (
                  <img
                    src={colorway.imageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300 dark:bg-slate-800">
                    <ImageOff className="size-5" />
                  </span>
                )}
                {colorway.colorwayName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default ColorwayPicker
