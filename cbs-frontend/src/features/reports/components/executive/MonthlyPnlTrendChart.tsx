import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyPnl } from '../../api/executiveReportApi';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium tabular-nums">₦{entry.value.toFixed(0)}M</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MonthlyPnlTrendChartProps {
  data: MonthlyPnl[];
}

const LEGEND_NAMES: Record<string, string> = {
  interestIncome: 'Interest Income',
  feeIncome: 'Fee Income',
  tradingIncome: 'Trading Income',
  netProfit: 'Net Profit',
};

export function MonthlyPnlTrendChart({ data }: MonthlyPnlTrendChartProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Monthly P&amp;L Trend</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Revenue components vs. net profit (₦M)</p>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data} margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₦${v}M`}
              width={62}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `₦${v}M`}
              width={62}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => LEGEND_NAMES[value] ?? value}
            />

            {/* Stacked bars */}
            <Bar
              yAxisId="left"
              dataKey="interestIncome"
              name="interestIncome"
              stackId="revenue"
              fill="#3b82f6"
              radius={[0, 0, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              yAxisId="left"
              dataKey="feeIncome"
              name="feeIncome"
              stackId="revenue"
              fill="#10b981"
              maxBarSize={36}
            />
            <Bar
              yAxisId="left"
              dataKey="tradingIncome"
              name="tradingIncome"
              stackId="revenue"
              fill="#8b5cf6"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
            />

            {/* Net Profit line overlay */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="netProfit"
              name="netProfit"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
