import type { LucideIcon } from 'lucide-react'

export type StatTone = 'amber' | 'red' | 'emerald' | 'sky'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone: StatTone
  hint: string
  highlight?: boolean
}

const toneClasses: Record<StatTone, { icon: string; ring: string; value: string }> = {
  amber: {
    icon: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300',
    ring: 'ring-slate-300/60 dark:ring-slate-600/40',
    value: 'text-slate-700 dark:text-slate-200',
  },
  red: {
    icon: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    ring: 'ring-red-300/60 dark:ring-red-500/20',
    value: 'text-red-600 dark:text-red-400',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    ring: 'ring-emerald-300/60 dark:ring-emerald-500/20',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  sky: {
    icon: 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    ring: 'ring-sky-300/60 dark:ring-sky-500/20',
    value: 'text-slate-900 dark:text-white',
  },
}

function StatCard({ label, value, icon: Icon, tone, hint, highlight }: StatCardProps) {
  const classes = toneClasses[tone]

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 ring-1 ring-inset dark:border-slate-800 dark:bg-slate-900/60 ${classes.ring} ${
        highlight ? 'ring-2' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${classes.value}`}>{value}</p>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${classes.icon}`}>
          <Icon className="size-5" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{hint}</p>
    </div>
  )
}

export default StatCard
