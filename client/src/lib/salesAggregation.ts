import { rangeStartDate, type SalesRange } from '../hooks/useSales'
import type { Sale } from '../types/api'

type BucketGranularity = 'day' | 'week' | 'month'

// Coarser buckets for wider ranges — 90 individual daily bars (let alone a
// multi-year "All Time") would be unreadable, so the bucket itself widens
// instead of trying to cram more bars into the same space.
function granularityFor(range: SalesRange): BucketGranularity {
  if (range === '90d') return 'week'
  if (range === 'all') return 'month'
  return 'day'
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date)
  next.setDate(next.getDate() - next.getDay())
  return next
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function bucketStart(date: Date, granularity: BucketGranularity): Date {
  if (granularity === 'day') return startOfDay(date)
  if (granularity === 'week') return startOfWeek(date)
  return startOfMonth(date)
}

function advance(date: Date, granularity: BucketGranularity): Date {
  const next = new Date(date)
  if (granularity === 'day') next.setDate(next.getDate() + 1)
  else if (granularity === 'week') next.setDate(next.getDate() + 7)
  else next.setMonth(next.getMonth() + 1)
  return next
}

function bucketLabel(date: Date, granularity: BucketGranularity): string {
  if (granularity === 'month') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface RevenuePoint {
  key: string
  label: string
  revenue: number
}

// A safety cap so a genuinely long "All Time" history can't render
// thousands of bars — if it's ever hit, only the most recent buckets show.
const MAX_POINTS = 60

// Builds a *complete* bucketed series — including zero-revenue buckets for
// any day/week/month with no sales — so the chart's x-axis spacing reflects
// real elapsed time rather than silently skipping quiet periods.
export function buildRevenueSeries(sales: Sale[], range: SalesRange): RevenuePoint[] {
  const granularity = granularityFor(range)
  const now = new Date()

  const earliestSale = sales.reduce<Date | null>((min, sale) => {
    const created = new Date(sale.createdAt)
    return !min || created < min ? created : min
  }, null)

  const start = bucketStart(rangeStartDate(range) ?? earliestSale ?? now, granularity)
  const end = bucketStart(now, granularity)

  const totals = new Map<string, number>()
  for (const sale of sales) {
    const key = bucketStart(new Date(sale.createdAt), granularity).toISOString()
    totals.set(key, (totals.get(key) ?? 0) + (sale.totalPrice ?? 0))
  }

  const points: RevenuePoint[] = []
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = advance(cursor, granularity)) {
    const key = cursor.toISOString()
    points.push({ key, label: bucketLabel(cursor, granularity), revenue: totals.get(key) ?? 0 })
  }

  return points.length > MAX_POINTS ? points.slice(points.length - MAX_POINTS) : points
}

export interface DesignRevenue {
  key: string
  designName: string
  revenue: number
  units: number
}

export function topDesignsByRevenue(sales: Sale[], limit: number): DesignRevenue[] {
  const totals = new Map<string, DesignRevenue>()
  for (const sale of sales) {
    const key = sale.designId ?? sale.designName
    const revenue = sale.totalPrice ?? 0
    const existing = totals.get(key)
    if (existing) {
      existing.revenue += revenue
      existing.units += sale.quantity
    } else {
      totals.set(key, { key, designName: sale.designName, revenue, units: sale.quantity })
    }
  }
  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}
