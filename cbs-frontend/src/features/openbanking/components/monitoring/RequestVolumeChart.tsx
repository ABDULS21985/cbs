import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  time: string;
  success: number;
  error: number;
}

interface RequestVolumeChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function RequestVolumeChart({ data, loading }: RequestVolumeChartProps) {
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
      <h3 className="text-sm font-semibold mb-4">Request Volume (last 60 min)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="success"
            name="Success"
            stackId="a"
            fill="hsl(142, 71%, 45%)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="error"
            name="Error"
            stackId="a"
            fill="hsl(0, 84%, 60%)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
