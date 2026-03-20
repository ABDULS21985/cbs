import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaturityRolloverRow {
  month: string;
  maturing: number;
  predictedRollover: number;
  predictedWithdrawal: number;
  rolloverRatePct?: number;
  liquidityRisk?: boolean;
}

interface MaturityRolloverChartProps {
  data: MaturityRolloverRow[];
  isLoading?: boolean;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function RolloverTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as MaturityRolloverRow;
  if (!row) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[200px]">
      <p className="font-semibold text-foreground border-b border-border pb-1">
        {label}
        {row.liquidityRisk && (
          <span className="ml-2 text-red-600 font-bold">LIQUIDITY RISK</span>
        )}
      </p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Maturing</span>
        <span className="font-semibold text-foreground">{formatMoneyCompact(row.maturing)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Predicted Rollover</span>
        <span className="font-semibold text-blue-600">{formatMoneyCompact(row.predictedRollover)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Predicted Withdrawal</span>
        <span className="font-semibold text-amber-600">{formatMoneyCompact(row.predictedWithdrawal)}</span>
      </div>
      {row.rolloverRatePct !== undefined && (
        <div className="flex justify-between gap-4 border-t border-border pt-1">
          <span className="text-muted-foreground">Rollover Rate</span>
          <span className="font-bold text-foreground">{row.rolloverRatePct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
      <div className="h-4 w-56 bg-muted rounded mb-2" />
      <div className="h-3 w-80 bg-muted rounded mb-6" />
      <div className="h-[280px] bg-muted/40 rounded" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaturityRolloverChart({ data, isLoading }: MaturityRolloverChartProps) {
  if (isLoading) return <ChartSkeleton />;

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Maturity Rollover Forecast</h2>
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          No maturity rollover data available
        </div>
      </div>
    );
  }

  const riskMonths = data.filter((d) => d.liquidityRisk);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Maturity Rollover Forecast</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          12-month forward view of maturing deposits with predicted rollover and withdrawal
        </p>
      </div>

      {riskMonths.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <div className="text-xs">
            <p className="font-semibold text-red-700 dark:text-red-400">Liquidity Risk Alert</p>
            <p className="text-red-600 dark:text-red-300 mt-0.5">
              {riskMonths.map((m) => m.month).join(', ')} {riskMonths.length === 1 ? 'has' : 'have'} elevated withdrawal risk. Review funding plan.
            </p>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="amount"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMoneyCompact(v)}
            width={55}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            width={40}
          />
          <Tooltip content={<RolloverTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconSize={10} />

          <Bar
            yAxisId="amount"
            dataKey="predictedRollover"
            name="Rollover"
            stackId="maturity"
            fill="#3b82f6"
            radius={[0, 0, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            yAxisId="amount"
            dataKey="predictedWithdrawal"
            name="Withdrawal"
            stackId="maturity"
            fill="#f59e0b"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="rolloverRatePct"
            name="Rollover Rate %"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend note */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Predicted Rollover
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" />
          Predicted Withdrawal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-purple-500 rounded" />
          Rollover Rate %
        </span>
      </div>
    </div>
  );
}
