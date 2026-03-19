import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { DepositGrowthPoint } from '../../api/depositAnalyticsApi';

interface DepositGrowthTrendProps {
  data: DepositGrowthPoint[];
  isLoading?: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground border-b border-border pb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.stroke }} className="font-medium">{entry.name}</span>
          <span className="text-foreground font-semibold tabular-nums">{formatMoneyCompact(entry.value)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-border pt-1">
        <span className="text-muted-foreground font-medium">Total</span>
        <span className="text-foreground font-bold tabular-nums">{formatMoneyCompact(total)}</span>
      </div>
    </div>
  );
}

export function DepositGrowthTrend({ data, isLoading }: DepositGrowthTrendProps) {
  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="termGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatMoneyCompact(v)}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Area
              type="monotone"
              dataKey="savings"
              name="Savings"
              stackId="1"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#savingsGrad)"
            />
            <Area
              type="monotone"
              dataKey="current"
              name="Current"
              stackId="1"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#currentGrad)"
            />
            <Area
              type="monotone"
              dataKey="term"
              name="Term"
              stackId="1"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#termGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
