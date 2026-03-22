import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { almReportApi } from '../../api/almReportApi';

interface DurationTrendChartProps {
  months?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[170px]">
      <p className="font-semibold text-sm mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </span>
          <span className="font-mono font-medium">{entry.value.toFixed(2)} yrs</span>
        </div>
      ))}
    </div>
  );
}

export function DurationTrendChart({ months = 12 }: DurationTrendChartProps) {
  const { from, to } = (() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  })();

  const { data: trend = [], isLoading } = useQuery({
    queryKey: ['duration-trend', from, to],
    queryFn: () => almReportApi.getDurationTrend(from, to),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-4">Duration Trend — Last {months} Months</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            interval={1}
          />
          <YAxis
            tickFormatter={(v) => `${v.toFixed(1)}y`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-muted-foreground">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="assetsDuration"
            name="Assets Duration"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="liabilitiesDuration"
            name="Liabilities Duration"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="gap"
            name="Duration Gap"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
