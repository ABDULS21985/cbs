import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  month: string;
  portfolioReturn: number;
  benchmarkReturn?: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

export function PortfolioPerformanceChart({ data, height = 300 }: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">No performance data available.</div>;
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold mb-4">Portfolio Performance Overview</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
          <Legend />
          <Line type="monotone" dataKey="portfolioReturn" name="Portfolio" stroke="#6366f1" strokeWidth={2} dot={false} />
          {data.some((d) => d.benchmarkReturn != null) && (
            <Line type="monotone" dataKey="benchmarkReturn" name="Benchmark" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
