import type { ScreenStatus } from '../types/api'

export const screenStatusLabels: Record<ScreenStatus, string> = {
  CLEAN_RECLAIMED: 'Clean',
  COATED_EMULSION: 'Coated',
  DEVELOPED: 'Developed',
  EXPOSED_READY: 'Exposed',
  ON_PRESS: 'On Press',
  NEEDS_RECLAIM: 'Needs Reclaim',
}

export const screenStatusStyles: Record<ScreenStatus, string> = {
  CLEAN_RECLAIMED:
    'bg-emerald-100 text-emerald-700 ring-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  COATED_EMULSION:
    'bg-violet-100 text-violet-700 ring-violet-400/60 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/30',
  DEVELOPED:
    'bg-indigo-100 text-indigo-700 ring-indigo-400/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30',
  EXPOSED_READY:
    'bg-sky-100 text-sky-700 ring-sky-400/60 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30',
  ON_PRESS:
    'bg-amber-100 text-amber-700 ring-amber-400/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  NEEDS_RECLAIM:
    'bg-red-100 text-red-700 ring-red-400/60 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
}
