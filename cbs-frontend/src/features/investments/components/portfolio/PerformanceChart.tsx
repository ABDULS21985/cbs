import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/formatters';

interface DataPoint { date: string; value: number; benchmark?: number }

interface Props {
  data: DataPoint[];
  currency?: string;
  benchmarkLabel?: string;
}

export function PerformanceChart({ data, currency = 'NGN', benchmarkLabel = 'Benchmark' }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No historical performance data available.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => formatMoney(v, currency)} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
        <Legend />
        <Line type="monotone" dataKey="value" name="Portfolio" stroke="#6366f1" strokeWidth={2} dot={false} />
        {data.some((d) => d.benchmark != null) && (
          <Line type="monotone" dataKey="benchmark" name={benchmarkLabel} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
