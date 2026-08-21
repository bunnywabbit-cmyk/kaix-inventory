import type { ActivityAction } from '../types/api'

export const activityActionLabels: Record<ActivityAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  STOCK_ADJUST: 'Stock',
}

export const activityActionStyles: Record<ActivityAction, string> = {
  CREATE:
    'bg-emerald-100 text-emerald-700 ring-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  UPDATE:
    'bg-sky-100 text-sky-700 ring-sky-400/60 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30',
  DELETE:
    'bg-red-100 text-red-700 ring-red-400/60 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
  STOCK_ADJUST:
    'bg-amber-100 text-amber-700 ring-amber-400/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
}
