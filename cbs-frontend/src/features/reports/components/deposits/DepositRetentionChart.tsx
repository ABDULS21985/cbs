import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { RetentionVintage, ChurnStat } from '../../api/depositAnalyticsApi';

interface DepositRetentionChartProps {
  data: RetentionVintage[];
  churnStats: ChurnStat | undefined;
  isLoading?: boolean;
}

const MONTHS = ['M3', 'M6', 'M9', 'M12', 'M18', 'M24'];

function getRetentionBg(rate: number): string {
  if (rate >= 90) return 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
  if (rate >= 70) return 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300';
  return 'bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-300';
}

function getChurnBarColor(pct: number): string {
  if (pct >= 25) return '#ef4444';
  if (pct >= 15) return '#f97316';
  return '#6b7280';
}

export function DepositRetentionChart({ data, churnStats, isLoading }: DepositRetentionChartProps) {
  // Build vintage → month → rate lookup
  const vintages = Array.from(new Set(data.map((d) => d.vintage)));
  const lookup: Record<string, Record<string, number | null>> = {};
  for (const v of vintages) {
    lookup[v] = {};
    for (const m of MONTHS) lookup[v][m] = null;
  }
  for (const row of data) {
    if (lookup[row.vintage]) {
      lookup[row.vintage][row.month] = row.retentionRate;
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Heatmap grid */}
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 text-muted-foreground font-medium w-28">Vintage</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-center py-1.5 px-1 text-muted-foreground font-medium min-w-[72px]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vintages.map((vintage) => (
                <tr key={vintage}>
                  <td className="py-1.5 px-2 font-semibold text-foreground">{vintage}</td>
                  {MONTHS.map((m) => {
                    const rate = lookup[vintage]?.[m] ?? null;
                    return (
                      <td key={m} className="text-center py-1 px-1">
                        {rate !== null ? (
                          <div
                            className={cn(
                              'rounded-md py-2 px-1 font-bold text-sm leading-none',
                              getRetentionBg(rate),
                            )}
                            title={`${vintage} · ${m}: ${rate}% retention`}
                          >
                            {rate}%
                          </div>
                        ) : (
                          <div className="rounded-md py-2 px-1 bg-muted/20 text-muted-foreground/30 text-center">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Heatmap legend */}
        <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            ≥90% Retained
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            70–90% Retained
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" />
            &lt;70% Retained
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-muted" />
            No data yet
          </span>
        </div>
      </div>

      {/* Churn summary */}
      {churnStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-md bg-muted/40 px-4 py-3">
              <div className="text-muted-foreground">Avg Tenure (Closed Accounts)</div>
              <div className="font-bold text-foreground text-lg mt-0.5">{churnStats.avgTenureMonths} months</div>
            </div>
            <div className="rounded-md bg-muted/40 px-4 py-3">
              <div className="text-muted-foreground">Total Accounts Closed (12M)</div>
              <div className="font-bold text-foreground text-lg mt-0.5">{churnStats.totalClosed.toLocaleString()}</div>
            </div>
          </div>

          {/* Churn reasons bar chart */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Top Reasons for Account Closure
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={churnStats.reasons}
                layout="vertical"
                margin={{ top: 2, right: 48, bottom: 2, left: 0 }}
                barSize={16}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="reason"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={160}
                />
                <Tooltip
                  formatter={(value: number, _name: string) => [`${value}%`, 'Share']}
                  labelFormatter={(label) => label}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="pct" name="Share" radius={[0, 3, 3, 0]}>
                  {churnStats.reasons.map((entry, index) => (
                    <Cell key={index} fill={getChurnBarColor(entry.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
