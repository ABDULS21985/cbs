import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import type { EfficiencyPoint } from '../../api/operationalReportApi';

interface EfficiencyTrendChartProps {
  data: EfficiencyPoint[];
  isLoading: boolean;
}

const INDUSTRY_BENCHMARK = 195;

function detectTrend(data: EfficiencyPoint[]): 'decreasing' | 'flat' | 'increasing' {
  if (data.length < 2) return 'flat';
  const first = data.slice(0, 3).reduce((s, d) => s + d.costPerTxn, 0) / 3;
  const last = data.slice(-3).reduce((s, d) => s + d.costPerTxn, 0) / 3;
  const diff = last - first;
  if (diff < -5) return 'decreasing';
  if (diff > 5) return 'increasing';
  return 'flat';
}

function EfficiencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-medium">{formatMoney(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function EfficiencyTrendChart({ data, isLoading }: EfficiencyTrendChartProps) {
  const trend = useMemo(() => detectTrend(data), [data]);

  const lineColor =
    trend === 'decreasing'
      ? '#10b981'
      : trend === 'increasing'
        ? '#ef4444'
        : '#f59e0b';

  const TrendIcon =
    trend === 'decreasing'
      ? TrendingDown
      : trend === 'increasing'
        ? TrendingUp
        : Minus;

  const trendLabel =
    trend === 'decreasing'
      ? 'Improving'
      : trend === 'increasing'
        ? 'Worsening'
        : 'Stable';

  const trendClass =
    trend === 'decreasing'
      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      : trend === 'increasing'
        ? 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
        : 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';

  return (
    <div className="surface-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Cost per Transaction Trend</h2>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              trendClass,
            )}
          >
            <TrendIcon className="w-3 h-3" />
            {trendLabel}
          </span>
        </div>
      </div>

      {/* YTD Annotation */}
      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 rounded-md px-3 py-1.5 border border-emerald-200 dark:border-emerald-800 w-fit">
        <TrendingDown className="w-3.5 h-3.5" />
        YTD improvement: -12% cost per transaction
      </div>

      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 10 }}>
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
              tickFormatter={(v) => `₦${v}`}
              width={52}
            />
            <ReferenceLine
              y={INDUSTRY_BENCHMARK}
              stroke="#6b7280"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Industry Avg ₦${INDUSTRY_BENCHMARK}`,
                position: 'right',
                fontSize: 10,
                fill: '#6b7280',
              }}
            />
            <Tooltip content={<EfficiencyTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={() => 'Cost per Transaction (₦)'}
            />
            <Line
              type="monotone"
              dataKey="costPerTxn"
              name="costPerTxn"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
