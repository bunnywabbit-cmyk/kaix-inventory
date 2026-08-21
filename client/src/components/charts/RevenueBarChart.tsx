import { useState } from 'react'
import { formatCurrency, formatCurrencyCompact } from '../../lib/currency'
import type { RevenuePoint } from '../../lib/salesAggregation'

interface RevenueBarChartProps {
  points: RevenuePoint[]
}

const CHART_HEIGHT = 176 // px

// Rounds a max value up to a "clean" axis ceiling (1/2/5 × 10^n) so ticks
// read as 0 / 2,000 / 4,000 rather than an arbitrary max-of-the-data number.
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

// Only every Nth x-axis label is shown once there are more bars than
// comfortably fit — labeling every bar on a 30-day view is unreadable noise.
function labelStride(count: number): number {
  if (count <= 10) return 1
  if (count <= 20) return 2
  if (count <= 40) return 4
  return Math.ceil(count / 10)
}

function RevenueBarChart({ points }: RevenueBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const maxRevenue = niceCeil(Math.max(...points.map((p) => p.revenue), 0))
  const stride = labelStride(points.length)

  if (points.length === 0) {
    return (
      <p className="flex h-44 items-center justify-center text-sm text-slate-500">
        No revenue in this range yet.
      </p>
    )
  }

  return (
    <div className="flex gap-2">
      <div
        className="flex shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-slate-400"
        style={{ height: CHART_HEIGHT }}
      >
        <span>{formatCurrencyCompact(maxRevenue)}</span>
        <span>{formatCurrencyCompact(maxRevenue / 2)}</span>
        <span>₱0</span>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0 flex flex-col justify-between">
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <div className="border-t border-slate-100 dark:border-slate-800" />
          <div className="border-t border-slate-200 dark:border-slate-800" />
        </div>

        <div className="relative flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
          {points.map((point, index) => {
            const heightPct = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0
            const isActive = activeIndex === index
            return (
              <div
                key={point.key}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex((current) => (current === index ? null : current))}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
              >
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={`${point.label}: ${formatCurrency(point.revenue)}`}
                  className={`w-full max-w-6 rounded-t outline-none transition-colors ${
                    isActive
                      ? 'bg-emerald-600 dark:bg-emerald-300'
                      : 'bg-emerald-500 dark:bg-emerald-400'
                  }`}
                  style={{ height: `${Math.max(heightPct, point.revenue > 0 ? 2 : 0)}%` }}
                />

                {isActive && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(point.revenue)}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">{point.label}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-1.5 flex gap-1">
          {points.map((point, index) => (
            <div key={point.key} className="flex-1 text-center text-[10px] text-slate-400">
              {index % stride === 0 ? point.label : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RevenueBarChart
