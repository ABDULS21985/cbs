import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { formatPercent } from '@/lib/formatters';
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
        Conversion Rate: <span className="font-medium text-foreground">{formatPercent(payload[0].value, 1)}</span>
      </p>
    </div>
  );
}

export function CostPerAcquisitionChart({ data }: CostPerAcquisitionChartProps) {
  if (!data.length) return null;

  const values = data.map((d) => d.conversionRate);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  const chartData = data.map((d) => ({
    stage: d.stage,
    conversionRate: d.conversionRate,
  }));

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Conversion Rate by Funnel Stage</h3>
        <span className="text-xs text-muted-foreground">
          Avg: <span className="font-medium text-foreground">{formatPercent(avg, 1)}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
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
          <Bar dataKey="conversionRate" name="Conversion Rate" radius={[4, 4, 0, 0]} maxBarSize={60} fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 text-xs pt-0.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
          Stage conversion rate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-gray-400 inline-block" />
          Average
        </span>
      </div>
    </div>
  );
}
