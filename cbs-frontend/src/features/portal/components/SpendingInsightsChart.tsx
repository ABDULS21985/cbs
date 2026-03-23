import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { SpendingBreakdown } from '../types/dashboard';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SpendingInsightsChartProps {
  spending: SpendingBreakdown;
  currency?: string;
}

function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SpendingInsightsChart({ spending, currency = 'NGN' }: SpendingInsightsChartProps) {
  const { totalThisMonth, totalLastMonth, changePercent, categories, smartInsights } = spending;
  const isUp = changePercent > 0;

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Spending Insights</h3>
        <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? 'text-red-500' : 'text-green-500'}`}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(changePercent).toFixed(1)}% vs last month
        </div>
      </div>

      <div className="flex gap-6">
        {/* Donut Chart */}
        <div className="flex-shrink-0 relative">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={categories}
                dataKey="amountThisMonth"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {categories.map((cat) => (
                  <Cell key={cat.category} fill={cat.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatMoney(value, currency)}
                labelFormatter={(label: string) => formatCategory(label)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold">{formatMoneyCompact(totalThisMonth, currency)}</span>
            <span className="text-[10px] text-muted-foreground">This month</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="flex-1 space-y-2 min-w-0">
          {categories.slice(0, 6).map((cat) => {
            const pct = totalThisMonth > 0 ? (cat.amountThisMonth / totalThisMonth) * 100 : 0;
            return (
              <div key={cat.category} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs truncate">{formatCategory(cat.category)}</span>
                  </div>
                  <span className="text-xs font-mono font-medium">
                    {formatMoneyCompact(cat.amountThisMonth, currency)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart insights */}
      {smartInsights.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t pt-3">
          {smartInsights.slice(0, 3).map((insight, i) => (
            <p key={i} className="text-xs text-muted-foreground">{insight}</p>
          ))}
        </div>
      )}

      {/* Month comparison footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
        <span>Last month: {formatMoneyCompact(totalLastMonth, currency)}</span>
        <span>This month: {formatMoneyCompact(totalThisMonth, currency)}</span>
      </div>
    </div>
  );
}
