import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ActivityLogPage } from '../types/api'

// Short, and refetches on window focus — overrides the app-wide 2-minute
// staleTime/no-refetch-on-focus defaults (see lib/queryClient.ts), which is
// what made this feed feel stuck on stale data: a mutation made on another
// page wouldn't show up here until the full 2 minutes lapsed. The server
// backs this with its own 20s cache that a mutation invalidates immediately
// (see ActivityLogService.logActivity), so a revalidation triggered by this
// is almost always a fast cache hit, not a fresh Neon round trip.
const RESPONSIVE_QUERY_OPTIONS = {
  staleTime: 15_000,
  refetchOnWindowFocus: true,
} as const

const fetchPage = (cursor: string | null) =>
  api.get<ActivityLogPage>(
    cursor ? `/activity-log?cursor=${encodeURIComponent(cursor)}` : '/activity-log',
  )

// The full, paginated Activity Log page.
export function useActivityLogFeed() {
  return useInfiniteQuery({
    queryKey: ['/activity-log', 'feed'],
    queryFn: ({ pageParam }: { pageParam: string | null }) => fetchPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    ...RESPONSIVE_QUERY_OPTIONS,
  })
}

// The Dashboard's Recent Activity card — just the first page, trimmed to
// `limit`. Kept as a separate query key from the feed above (both hit the
// same first-page server cache either way) since useInfiniteQuery and
// useQuery cache their data in incompatible shapes under one key.
export function useRecentActivity(limit: number) {
  const query = useQuery({
    queryKey: ['/activity-log', 'recent'],
    queryFn: () => fetchPage(null),
    ...RESPONSIVE_QUERY_OPTIONS,
  })

  return {
    entries: (query.data?.entries ?? []).slice(0, limit),
    loading: query.isPending,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
  }
}
