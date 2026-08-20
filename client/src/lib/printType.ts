import type { PrintType } from '../types/api'

export const printTypeLabels: Record<PrintType, string> = {
  SILKSCREEN: 'Silkscreen',
  DTF: 'DTF',
}

export const printTypeStyles: Record<PrintType, string> = {
  SILKSCREEN:
    'bg-violet-100 text-violet-700 ring-violet-400/60 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/30',
  DTF: 'bg-sky-100 text-sky-700 ring-sky-400/60 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30',
}
