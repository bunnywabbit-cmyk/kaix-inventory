export function cellKey(color: string, size: string) {
  return `${color}::${size}`
}

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const indexA = SIZE_ORDER.indexOf(a)
    const indexB = SIZE_ORDER.indexOf(b)
    if (indexA === -1 && indexB === -1) return a.localeCompare(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })
}

interface ColorSizeItem {
  color: string | null
  size: string | null
}

export interface VariantGroupInfo {
  matrixReady: boolean
  colors: string[]
  sizes: string[]
}

/** Detects whether a set of items forms a clean color x size matrix (2+ items, every item has both set). */
export function analyzeVariantGroup(items: ColorSizeItem[]): VariantGroupInfo {
  const matrixReady = items.length > 1 && items.every((item) => item.color && item.size)
  if (!matrixReady) return { matrixReady: false, colors: [], sizes: [] }

  const colors = [...new Set(items.map((item) => item.color!))].sort((a, b) => a.localeCompare(b))
  const sizes = sortSizes([...new Set(items.map((item) => item.size!))])
  return { matrixReady: true, colors, sizes }
}
