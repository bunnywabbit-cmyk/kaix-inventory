import { ImageOff, Receipt, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import RevenueBarChart from '../charts/RevenueBarChart'
import { useSales, type SalesRange } from '../../hooks/useSales'
import { formatCurrency } from '../../lib/currency'
import { buildRevenueSeries, topDesignsByRevenue } from '../../lib/salesAggregation'
import AsyncState from '../ui/AsyncState'
import StatCard from '../ui/StatCard'

interface SalesRevenueProps {
  searchQuery: string
}

const RANGE_OPTIONS: { value: SalesRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

function SalesRevenue({ searchQuery }: SalesRevenueProps) {
  const [range, setRange] = useState<SalesRange>('30d')
  const { sales, loading, error } = useSales(range)
  const query = searchQuery.trim().toLowerCase()

  const filteredSales = query
    ? sales.filter(
        (sale) =>
          sale.designName.toLowerCase().includes(query) ||
          sale.color.toLowerCase().includes(query) ||
          sale.garmentStyle.toLowerCase().includes(query),
      )
    : sales

  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + (sale.totalPrice ?? 0), 0),
    [filteredSales],
  )
  const totalUnits = useMemo(
    () => filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
    [filteredSales],
  )
  const avgSaleValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0

  const revenueSeries = useMemo(() => buildRevenueSeries(filteredSales, range), [filteredSales, range])
  const topDesigns = useMemo(() => topDesignsByRevenue(filteredSales, 5), [filteredSales])
  const maxDesignRevenue = topDesigns[0]?.revenue ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sales & Revenue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Revenue booked through stock sales, across every design.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              range === option.value
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'border border-slate-200 text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading sales..." />
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={Wallet}
              tone="emerald"
              hint={`Across ${filteredSales.length} sale${filteredSales.length === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Units Sold"
              value={totalUnits.toLocaleString()}
              icon={ShoppingBag}
              tone="sky"
              hint="Pieces sold in this range"
            />
            <StatCard
              label="Transactions"
              value={filteredSales.length.toLocaleString()}
              icon={Receipt}
              tone="sky"
              hint="Stock-out sales logged"
            />
            <StatCard
              label="Avg Sale Value"
              value={formatCurrency(avgSaleValue)}
              icon={TrendingUp}
              tone="amber"
              hint="Revenue per transaction"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Revenue Over Time</h3>
            <div className="mt-4">
              <RevenueBarChart points={revenueSeries} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Top Designs by Revenue
              </h3>
              <div className="mt-3 space-y-3">
                {topDesigns.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">No sales in this range yet.</p>
                )}
                {topDesigns.map((design, index) => (
                  <div key={design.key} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {design.designName}
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
                          style={{
                            width: `${maxDesignRevenue > 0 ? (design.revenue / maxDesignRevenue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(design.revenue)}
                      </p>
                      <p className="text-xs text-slate-400">{design.units} pcs</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Sales</h3>
              <div className="mt-3 max-h-96 divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800/80">
                {filteredSales.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    {query ? `No sales match "${searchQuery}".` : 'No sales in this range yet.'}
                  </p>
                )}
                {filteredSales.slice(0, 100).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-slate-300 dark:border-slate-800 dark:text-slate-700">
                        <ImageOff className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {sale.designName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {sale.color} / {sale.size} &middot; qty {sale.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(sale.totalPrice ?? 0)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SalesRevenue
