import { useMemo } from 'react';
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

interface DataPoint {
  time: string;
  client4xx: number;
  server5xx: number;
}

interface ErrorRateChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function ErrorRateChart({ data, loading }: ErrorRateChartProps) {
  const chartData = useMemo(() => data, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Error Rate Over Time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="client4xx"
            name="4xx Errors"
            stackId="1"
            stroke="hsl(38, 92%, 50%)"
            fill="hsl(38, 92%, 50%)"
            fillOpacity={0.4}
          />
          <Area
            type="monotone"
            dataKey="server5xx"
            name="5xx Errors"
            stackId="1"
            stroke="hsl(0, 84%, 60%)"
            fill="hsl(0, 84%, 60%)"
            fillOpacity={0.4}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
