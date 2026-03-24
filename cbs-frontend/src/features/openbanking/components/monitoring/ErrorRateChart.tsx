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
  label: string;
  errorRate: number;
}

interface ErrorRateChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function ErrorRateChart({ data, loading }: ErrorRateChartProps) {
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
          <p className="text-sm font-medium text-foreground">No error-rate data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Error-rate trends will show here once usage statistics are available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-monitor-panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Error Rate Trend</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Percentage of failed calls within each published usage window.
          </p>
        </div>
        <span className="ob-monitor-chip">Percent</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            unit="%"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error rate']}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="errorRate"
            name="Error Rate"
            stackId="1"
            stroke="hsl(0, 84%, 60%)"
            fill="hsl(0, 84%, 60%)"
            fillOpacity={0.4}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
