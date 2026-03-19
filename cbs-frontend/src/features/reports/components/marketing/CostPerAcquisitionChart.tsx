import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { LeadFunnelRow } from '../../api/marketingAnalyticsApi';

interface CostPerAcquisitionChartProps {
  data: LeadFunnelRow[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        CPA: <span className="font-medium text-foreground">{formatMoney(payload[0].value)}</span>
      </p>
    </div>
  );
}

function getBarColor(value: number, min: number, max: number): string {
  if (value === min) return '#22c55e';
  if (value === max) return '#ef4444';
  const mid = (min + max) / 2;
  return value <= mid ? '#86efac' : '#fca5a5';
}

export function CostPerAcquisitionChart({ data }: CostPerAcquisitionChartProps) {
  if (!data.length) return null;

  const values = data.map((d) => d.costPerAcquisition);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  const chartData = data.map((d) => ({
    source: d.source,
    cpa: d.costPerAcquisition,
  }));

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Cost per Acquisition by Source</h3>
        <span className="text-xs text-muted-foreground">
          Avg: <span className="font-medium text-foreground">{formatMoney(avg)}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="source"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}K`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avg}
            stroke="#6b7280"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: 'Avg', position: 'right', fontSize: 10, fill: '#6b7280' }}
          />
          <Bar dataKey="cpa" name="CPA" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {chartData.map((entry) => (
              <Cell key={entry.source} fill={getBarColor(entry.cpa, min, max)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-xs pt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          Lowest CPA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Highest CPA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-gray-400 inline-block" />
          Average
        </span>
      </div>
    </div>
  );
}
