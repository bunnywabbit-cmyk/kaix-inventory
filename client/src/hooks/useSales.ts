import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../lib/api'
import type { Sale } from '../types/api'

export type SalesRange = '7d' | '30d' | '90d' | 'all'

const RANGE_DAYS: Record<Exclude<SalesRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

// Exported so the chart's bucketing (lib/salesAggregation.ts) starts at the
// same boundary this hook filters the API request by — otherwise the chart
// could show a partial leading bucket that disagrees with the KPI totals.
export function rangeStartDate(range: SalesRange): Date | null {
  if (range === 'all') return null
  const since = new Date()
  since.setDate(since.getDate() - RANGE_DAYS[range])
  return since
}

export function useSales(range: SalesRange) {
  // Memoized on `range` alone — rangeStartDate() calls `new Date()`, so
  // computing this on every render (rather than only when `range` changes)
  // produced a millisecond-different `since` each time, which fed straight
  // into the query key below. React Query saw that as a brand-new query on
  // every render — no cached data, stuck re-fetching forever, which is what
  // made this page look permanently stuck loading.
  const since = useMemo(() => rangeStartDate(range)?.toISOString() ?? null, [range])
  const query = useQuery({
    queryKey: ['/sales', since ?? 'all'],
    queryFn: () => api.get<Sale[]>(since ? `/sales?since=${encodeURIComponent(since)}` : '/sales'),
    staleTime: 30_000,
  })

  return {
    sales: query.data ?? [],
    loading: query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
  }
}
