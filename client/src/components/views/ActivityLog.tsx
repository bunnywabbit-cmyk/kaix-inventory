import { History, Loader2, TriangleAlert } from 'lucide-react'
import { useActivityLogFeed } from '../../hooks/useActivityLog'
import { activityActionLabels, activityActionStyles } from '../../lib/activityAction'
import { relativeTime } from '../../lib/relativeTime'

interface ActivityLogProps {
  searchQuery: string
}

function ActivityLog({ searchQuery }: ActivityLogProps) {
  const query = searchQuery.trim().toLowerCase()

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityLogFeed()

  const entries = (data?.pages ?? []).flatMap((page) => page.entries)
  const filtered = query
    ? entries.filter(
        (entry) =>
          entry.message.toLowerCase().includes(query) ||
          entry.entityType.toLowerCase().includes(query) ||
          (entry.user?.email.toLowerCase().includes(query) ?? false),
      )
    : entries

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Activity Log</h2>
        <p className="mt-1 text-sm text-slate-500">
          A running trail of who changed what, across the whole app.
        </p>
      </div>

      {isPending && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Loading activity...
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-10 text-center text-sm dark:border-red-500/30 dark:bg-red-500/10">
          <TriangleAlert className="size-5 text-red-600 dark:text-red-400" />
          <p className="font-medium text-red-700 dark:text-red-400">Couldn't load activity</p>
          <p className="text-red-600/80 dark:text-red-400/70">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      )}

      {!isPending && !isError && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-500 dark:border-slate-800">
              <History className="size-5 text-slate-300 dark:text-slate-700" />
              {query ? `No activity matches "${searchQuery}".` : 'No activity yet.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/60">
              {filtered.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${activityActionStyles[entry.action]}`}
                  >
                    {activityActionLabels[entry.action]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {entry.message}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {entry.user?.email ?? 'System'}
                    </p>
                  </div>
                  <time
                    dateTime={entry.createdAt}
                    title={new Date(entry.createdAt).toLocaleString()}
                    className="shrink-0 text-xs text-slate-400"
                  >
                    {relativeTime(entry.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
                Load older activity
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityLog
