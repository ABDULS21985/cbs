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
  label: string;
  successCalls: number;
  errorCalls: number;
}

interface RequestVolumeChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function RequestVolumeChart({ data, loading }: RequestVolumeChartProps) {
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
          <p className="text-sm font-medium text-foreground">No request volume data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Request counts will chart here once usage aggregates are published.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-monitor-panel p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Request Volume</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Successful versus failed calls from the published aggregate feed.
          </p>
        </div>
        <span className="ob-monitor-chip">{chartData.length} snapshots</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
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
            dataKey="successCalls"
            name="Success"
            stackId="a"
            fill="hsl(142, 71%, 45%)"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="errorCalls"
            name="Error"
            stackId="a"
            fill="hsl(0, 84%, 60%)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
