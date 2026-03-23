import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  time: string;
  p50: number;
  p95: number;
  p99: number;
}

interface EndpointLatencyChartProps {
  data: DataPoint[];
  loading?: boolean;
}

const LINES = [
  { key: 'p50', name: 'P50', color: 'hsl(217, 91%, 60%)' },
  { key: 'p95', name: 'P95', color: 'hsl(38, 92%, 50%)' },
  { key: 'p99', name: 'P99', color: 'hsl(0, 84%, 60%)' },
] as const;

export function EndpointLatencyChart({ data, loading }: EndpointLatencyChartProps) {
  const chartData = useMemo(() => data, [data]);

  if (loading) {
    return (
      <div className="surface-card p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Endpoint Latency (ms)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            unit=" ms"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} ms`]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {LINES.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
