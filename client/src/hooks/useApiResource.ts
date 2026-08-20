import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

interface UseApiResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Patch the cached data in place (e.g. to reflect a mutation immediately), without waiting on a refetch round-trip. */
  mutate: (updater: (prev: T | null) => T | null) => void;
}

// Backed by React Query so every component calling this with the same `path`
// shares one cached fetch — navigating back to an already-visited view is
// instant instead of re-fetching, and a mutation's `mutate()`/`refetch()`
// call updates that shared cache everywhere it's read, not just locally.
// The external shape ({data, loading, error, refetch, mutate}) is kept
// identical to the pre-React-Query version on purpose, so none of the ~20
// call sites across the app needed to change.
export function useApiResource<T>(path: string): UseApiResourceResult<T> {
  const queryClient = useQueryClient();
  const queryKey = [path];

  const query = useQuery<T>({
    queryKey,
    queryFn: () => api.get<T>(path),
  });

  const refetch = () => {
    void query.refetch();
  };

  const mutate = (updater: (prev: T | null) => T | null) => {
    queryClient.setQueryData<T>(queryKey, (prev) => (updater(prev ?? null) ?? undefined) as T | undefined);
  };

  return {
    data: query.data ?? null,
    loading: query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    refetch,
    mutate,
  };
}
