import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { GrowthPoint } from '../../api/customerAnalyticsApi';

interface CustomerGrowthTrendProps {
  data: GrowthPoint[];
  isLoading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}:{' '}
          <span className="font-medium tabular-nums">
            {Math.abs(entry.value).toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

function formatLegendLabel(value: string): string {
  switch (value) {
    case 'newCustomers': return 'New Customers';
    case 'churned': return 'Churned';
    case 'net': return 'Net Growth';
    default: return value;
  }
}

export function CustomerGrowthTrend({ data, isLoading }: CustomerGrowthTrendProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Customer Growth Trend — 12 Months</h2>

      {isLoading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 20, bottom: 4, left: 10 }}>
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
              tickFormatter={(v) => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              width={48}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={formatLegendLabel}
            />
            <Bar
              dataKey="newCustomers"
              name="newCustomers"
              fill="#22c55e"
              radius={[3, 3, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="churned"
              name="churned"
              fill="#ef4444"
              radius={[0, 0, 3, 3]}
              maxBarSize={28}
            />
            <Area
              type="monotone"
              dataKey="net"
              name="net"
              stroke="#14b8a6"
              fill="#14b8a6"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 3, fill: '#14b8a6', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
