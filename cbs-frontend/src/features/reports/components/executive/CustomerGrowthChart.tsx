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
  ReferenceLine,
} from 'recharts';
import type { CustomerGrowthData } from '../../api/executiveReportApi';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1 min-w-[170px]">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium tabular-nums">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CustomerGrowthChartProps {
  data: CustomerGrowthData[];
}

const LEGEND_NAMES: Record<string, string> = {
  newCustomers: 'New Customers',
  closedCustomers: 'Closed Accounts',
  totalCustomers: 'Total Customers',
};

export function CustomerGrowthChart({ data }: CustomerGrowthChartProps) {
  // Negate closedCustomers for visual downward bars
  const chartData = data.map((d) => ({
    ...d,
    closedCustomers: -d.closedCustomers,
  }));

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Customer Growth</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Monthly new vs. closed accounts &amp; total base</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
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
            tickFormatter={(v: number) => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}K` : String(v)}
            width={52}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => LEGEND_NAMES[value] ?? value}
          />

          <Bar
            yAxisId="left"
            dataKey="newCustomers"
            name="newCustomers"
            fill="#10b981"
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            yAxisId="left"
            dataKey="closedCustomers"
            name="closedCustomers"
            fill="#ef4444"
            radius={[0, 0, 3, 3]}
            maxBarSize={28}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalCustomers"
            name="totalCustomers"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
