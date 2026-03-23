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
import { formatDate } from '@/lib/formatters';
import type { FraudTrendPoint } from '../../types/fraud';

interface Props {
  data: FraudTrendPoint[];
  isLoading: boolean;
}

export function FraudTrendChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="mx-6 surface-card p-4">
        <div className="h-4 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="h-[200px] bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    dateLabel: formatDate(d.date),
  }));

  if (formatted.length === 0) {
    return (
      <div className="mx-6 surface-card p-4">
        <div className="text-sm font-semibold mb-1">Fraud Alert Trend</div>
        <div className="text-sm text-muted-foreground">No recent fraud alerts were returned for the selected period.</div>
      </div>
    );
  }

  return (
    <div className="mx-6 surface-card p-4">
      <div className="text-sm font-semibold mb-3">Fraud Alert Trend</div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={formatted} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={36}
            label={{ value: 'Alerts', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={50}
            label={{ value: 'Investigations / Score', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            yAxisId="left"
            dataKey="alertCount"
            name="Alert Count"
            fill="hsl(var(--primary))"
            radius={[2, 2, 0, 0]}
            maxBarSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="investigatingCount"
            name="Investigating"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="averageRiskScore"
            name="Avg. Risk Score"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
