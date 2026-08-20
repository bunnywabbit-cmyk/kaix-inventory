import type { PrintRunStatus } from '../types/api'

export const printRunStatusLabels: Record<PrintRunStatus, string> = {
  PLANNED: 'Planned',
  FINISHED: 'Finished',
}

export const printRunStatusStyles: Record<PrintRunStatus, string> = {
  PLANNED:
    'bg-amber-100 text-amber-700 ring-amber-400/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  FINISHED:
    'bg-emerald-100 text-emerald-700 ring-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
}
