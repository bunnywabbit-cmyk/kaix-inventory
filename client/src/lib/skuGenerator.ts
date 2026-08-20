function abbreviate(text: string, maxLen: number): string {
  const words = text.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (words.length > 1) {
    return words
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, maxLen)
  }
  return text.replace(/\s+/g, '').slice(0, maxLen).toUpperCase()
}

// Standard apparel-industry color codes aren't derivable from a clean formula
// (WHT, BLK, NVY drop letters a naive slice wouldn't), so the common ones —
// including every "Quick Add" preset — are looked up directly.
const COLOR_ABBREVIATIONS: Record<string, string> = {
  white: 'WHT',
  black: 'BLK',
  navy: 'NVY',
  'heather grey': 'HGR',
  'heather gray': 'HGR',
  red: 'RED',
  grey: 'GRY',
  gray: 'GRY',
  royal: 'ROY',
  maroon: 'MAR',
  charcoal: 'CHR',
  forest: 'FOR',
  orange: 'ORG',
  purple: 'PPL',
  yellow: 'YLW',
  green: 'GRN',
}

function abbreviateColor(color: string): string {
  const known = COLOR_ABBREVIATIONS[color.trim().toLowerCase()]
  return known ?? abbreviate(color, 3)
}

export const FIT_STYLE_OPTIONS = ['Oversized', 'Boxy'] as const
export type FitStyle = (typeof FIT_STYLE_OPTIONS)[number]

const STYLE_ABBREVIATIONS: Record<string, string> = {
  oversized: 'OVR',
  boxy: 'BXY',
}

function abbreviateStyle(style: string): string {
  const known = STYLE_ABBREVIATIONS[style.trim().toLowerCase()]
  return known ?? abbreviate(style, 3)
}

export function generateVariantSku(brand: string, style: string, color: string, size: string): string {
  const brandCode = abbreviate(brand, 3) || 'GEN'
  const styleCode = abbreviateStyle(style) || 'STD'
  const colorCode = abbreviateColor(color) || 'COL'
  const sizeCode = size.trim().toUpperCase()
  return [brandCode, styleCode, colorCode, sizeCode].join('-')
}

// Supply items (inks, tapes, packaging) have no natural brand/color/size structure to
// derive a SKU from, so a short random suffix stands in for uniqueness instead.
export function generateSupplySku(name: string): string {
  const nameCode = abbreviate(name, 6) || 'ITEM'
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${nameCode}-${suffix}`
}
