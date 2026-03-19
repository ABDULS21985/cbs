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
import { formatMoneyCompact, formatDate } from '@/lib/formatters';
import type { UtilizationPoint } from '../../types/facility';

interface UtilizationHistoryChartProps {
  data: UtilizationPoint[];
  isLoading?: boolean;
}

export function UtilizationHistoryChart({ data, isLoading }: UtilizationHistoryChartProps) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart…</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No utilization history available.
      </div>
    );
  }

  const formatted = data.map((p) => ({
    date: formatDate(p.date),
    Utilized: p.utilized,
    Limit: p.limit,
  }));

  return (
    <div className="p-4">
      <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wide">
        12-Month Utilization History
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(v)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatMoneyCompact(value), name]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="Utilized"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Limit"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
