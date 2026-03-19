import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { MaturityBucket } from '../../api/depositAnalyticsApi';

interface MaturityProfileChartProps {
  buckets: MaturityBucket[];
  isLoading?: boolean;
}

function getBarColor(index: number, total: number): string {
  const ratio = index / Math.max(total - 1, 1);
  // Interpolate from amber (near-term) to emerald (far-term)
  const r = Math.round(245 - ratio * (245 - 16));
  const g = Math.round(158 + ratio * (185 - 158));
  const b = Math.round(11 + ratio * (129 - 11));
  return `rgb(${r},${g},${b})`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MaturityBucket;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[180px]">
      <p className="font-semibold text-foreground border-b border-border pb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Maturing Amount</span>
        <span className="font-semibold text-foreground">{formatMoneyCompact(d.amount)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">No. of Deposits</span>
        <span className="font-semibold text-foreground">{d.count.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Avg Rate</span>
        <span className="font-semibold text-foreground">{d.avgRate.toFixed(2)}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Avg Tenor</span>
        <span className="font-semibold text-foreground">{d.avgTenor} days</span>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-1">
        <span className="text-muted-foreground">Expected Rollover</span>
        <span className="font-bold text-emerald-600">{d.rolloverPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function MaturityProfileChart({ buckets, isLoading }: MaturityProfileChartProps) {
  const totalMaturingAmount = buckets.reduce((s, b) => s + b.amount, 0);
  const weightedAvgRate =
    buckets.length > 0
      ? buckets.reduce((s, b) => s + b.avgRate * b.amount, 0) / totalMaturingAmount
      : 0;
  const weightedAvgTenor =
    buckets.length > 0
      ? buckets.reduce((s, b) => s + b.avgTenor * b.amount, 0) / totalMaturingAmount
      : 0;

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={buckets} margin={{ top: 4, right: 12, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMoneyCompact(v)}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={totalMaturingAmount / buckets.length}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <Bar dataKey="amount" name="Maturing Amount" radius={[3, 3, 0, 0]} maxBarSize={44}>
            {buckets.map((_, index) => (
              <Cell key={index} fill={getBarColor(index, buckets.length)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
          <div className="text-muted-foreground">Total Maturing (12M)</div>
          <div className="font-bold text-foreground mt-0.5">{formatMoneyCompact(totalMaturingAmount)}</div>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
          <div className="text-muted-foreground">Wtd. Avg Rate</div>
          <div className="font-bold text-foreground mt-0.5">{weightedAvgRate.toFixed(2)}%</div>
        </div>
        <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
          <div className="text-muted-foreground">Wtd. Avg Tenor</div>
          <div className="font-bold text-foreground mt-0.5">{Math.round(weightedAvgTenor)} days</div>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" />
          Near-term
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Further out
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 border-t border-dashed border-muted-foreground" />
          Monthly average
        </div>
      </div>
    </div>
  );
}
