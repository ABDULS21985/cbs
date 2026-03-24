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
  label: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

interface EndpointLatencyChartProps {
  data: DataPoint[];
  loading?: boolean;
}

const LINES = [
  { key: 'avgLatencyMs', name: 'Average', color: 'hsl(217, 91%, 60%)' },
  { key: 'p95LatencyMs', name: 'P95', color: 'hsl(38, 92%, 50%)' },
] as const;

export function EndpointLatencyChart({ data, loading }: EndpointLatencyChartProps) {
  const chartData = useMemo(() => data, [data]);

  if (loading) {
    return (
      <div className="ob-monitor-panel p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="ob-monitor-empty-state min-h-[320px]">
        <div>
          <p className="text-sm font-medium text-foreground">No latency telemetry</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Average and P95 latency lines appear when the monitoring feed becomes available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-monitor-panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Endpoint Latency</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Observed average versus P95 response times from aggregated usage.
          </p>
        </div>
        <span className="ob-monitor-chip">Milliseconds</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
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
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
