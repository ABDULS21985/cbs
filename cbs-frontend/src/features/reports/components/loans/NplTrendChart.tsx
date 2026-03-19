import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { NplTrendPoint } from '../../api/loanAnalyticsApi';

interface NplTrendChartProps {
  data: NplTrendPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}:{' '}
          <span className="font-medium">
            {entry.dataKey === 'nplAmount'
              ? formatMoneyCompact(entry.value)
              : `${entry.value.toFixed(2)}%`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function NplTrendChart({ data }: NplTrendChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">NPL Trend — 12 Months</h2>
          <p className="text-xs text-muted-foreground mt-0.5">NPL amount (bars, left axis) vs NPL ratio % (line, right axis)</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-4 h-0 border-t-2 border-dashed border-red-500 inline-block" />
          CBN limit 5%
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 56, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={48}
          />

          {/* Left Y-axis: NPL Amount */}
          <YAxis
            yAxisId="amount"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMoneyCompact(v)}
            width={60}
          />

          {/* Right Y-axis: NPL Ratio % */}
          <YAxis
            yAxisId="ratio"
            orientation="right"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            domain={[0, 7]}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === 'nplAmount' ? 'NPL Amount' : 'NPL Ratio (%)')}
          />

          {/* CBN 5% limit reference line */}
          <ReferenceLine
            yAxisId="ratio"
            y={5}
            stroke="#ef4444"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: '5% CBN limit', position: 'insideTopRight', fontSize: 10, fill: '#ef4444', dy: -4 }}
          />

          <Bar
            yAxisId="amount"
            dataKey="nplAmount"
            name="nplAmount"
            fill="#f59e0b"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
            opacity={0.85}
          />

          <Line
            yAxisId="ratio"
            type="monotone"
            dataKey="nplRatio"
            name="nplRatio"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
