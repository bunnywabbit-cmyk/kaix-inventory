// ₱ throughout — matches PriceInput and every price field in the app.
export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Stat-tile-sized values (1,284 / 12.9K / 4.2M) — used where a full decimal
// figure would crowd out everything else around it.
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`
  return `₱${amount.toFixed(0)}`
}
