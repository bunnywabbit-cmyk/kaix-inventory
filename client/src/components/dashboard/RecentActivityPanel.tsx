import { History } from 'lucide-react'
import { useRecentActivity } from '../../hooks/useActivityLog'
import { activityActionLabels, activityActionStyles } from '../../lib/activityAction'
import { relativeTime } from '../../lib/relativeTime'

interface RecentActivityPanelProps {
  onViewAll: () => void
}

const VISIBLE_COUNT = 5

function RecentActivityPanel({ onViewAll }: RecentActivityPanelProps) {
  const { entries, loading, error } = useRecentActivity(VISIBLE_COUNT)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="size-4 text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View all &rarr;
        </button>
      </div>

      <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800/80">
        {loading && (
          <p className="py-6 text-center text-sm text-slate-500">Loading activity...</p>
        )}
        {!loading && error && (
          <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!loading && !error && entries.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">Nothing logged yet.</p>
        )}
        {!loading &&
          !error &&
          entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${activityActionStyles[entry.action]}`}
                >
                  {activityActionLabels[entry.action]}
                </span>
                <p className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-200">
                  {entry.message}
                </p>
              </div>
              <span
                title={new Date(entry.createdAt).toLocaleString()}
                className="shrink-0 text-xs text-slate-400"
              >
                {relativeTime(entry.createdAt)}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default RecentActivityPanel
