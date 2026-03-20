import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PositionTable } from './PositionTable';
import type { PortfolioPositionSummary } from '../../api/secPositionApi';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

interface PortfolioPositionViewProps {
  data?: PortfolioPositionSummary;
  isLoading: boolean;
}

export function PortfolioPositionView({ data, isLoading }: PortfolioPositionViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        Select a portfolio to view positions
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{data.portfolioName}</p>
          <p className="text-xs text-muted-foreground">{data.portfolioCode} — {data.positionCount} positions</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Market Value</p>
          <p className="text-xl font-bold tabular-nums">{formatMoney(data.totalMarketValue, data.currency)}</p>
        </div>
      </div>

      {/* Asset class breakdown */}
      {data.byAssetClass.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium mb-3">Allocation by Asset Class</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.byAssetClass}
                  dataKey="marketValue"
                  nameKey="assetClass"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {data.byAssetClass.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatMoney(v, data.currency), 'Value']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">Asset Class Breakdown</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Asset Class</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Value</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">%</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.byAssetClass.map((ac, i) => (
                  <tr key={ac.assetClass} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium">{ac.assetClass}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(ac.marketValue, data.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ac.percentage.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ac.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Position details */}
      <PositionTable data={data.positions} isLoading={false} />
    </div>
  );
}
