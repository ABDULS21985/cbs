import { useMemo } from 'react';
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

interface DataPoint {
  month: string;
  newTpps: number;
  cumulative: number;
}

interface TppAdoptionChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function TppAdoptionChart({ data, loading }: TppAdoptionChartProps) {
  const chartData = useMemo(() => data, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-72 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">TPP Adoption</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            label={{ value: 'New TPPs', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            label={{ value: 'Cumulative', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
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
          <Bar
            yAxisId="left"
            dataKey="newTpps"
            name="New TPPs"
            fill="hsl(217, 91%, 60%)"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            name="Cumulative Total"
            stroke="hsl(262, 83%, 58%)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'hsl(262, 83%, 58%)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
