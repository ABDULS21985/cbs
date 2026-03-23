import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendDataPoint {
  date: string;
  reconciliationRate: number;
  breakAmount: number;
  autoMatchRate: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BreakTrendChartProps {
  historyMap: Record<string, Array<{ date: string; status: string; difference: number; matchedCount: number }>>;
}

export function BreakTrendChart({ historyMap }: BreakTrendChartProps) {
  const chartData = useMemo(() => {
    // Aggregate all history entries by date
    const dateMap: Record<string, {
      total: number;
      completed: number;
      breakAmount: number;
      matchedCount: number;
      totalEntries: number;
    }> = {};

    Object.values(historyMap).forEach((history) => {
      history.forEach((h) => {
        const key = h.date.slice(0, 10);
        if (!dateMap[key]) {
          dateMap[key] = { total: 0, completed: 0, breakAmount: 0, matchedCount: 0, totalEntries: 0 };
        }
        dateMap[key].total += 1;
        if (h.status === 'COMPLETED') dateMap[key].completed += 1;
        dateMap[key].breakAmount += Math.abs(h.difference);
        dateMap[key].matchedCount += h.matchedCount;
        // Estimate total entries from matched count (approx)
        dateMap[key].totalEntries += Math.max(h.matchedCount, 1);
      });
    });

    // Sort by date and take last 90 days
    const sorted = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-90);

    return sorted.map(([date, stats]): TrendDataPoint => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      reconciliationRate: stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0,
      breakAmount: Math.round(stats.breakAmount),
      autoMatchRate: stats.totalEntries > 0
        ? Math.round((stats.matchedCount / stats.totalEntries) * 100)
        : 0,
    }));
  }, [historyMap]);

  const hasData = chartData.length > 0;

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-3.5 border-b">
        <h3 className="text-sm font-semibold">Reconciliation Trends</h3>
        <p className="text-xs text-muted-foreground mt-0.5">90-day trend of reconciliation performance</p>
      </div>
      <div className="p-5">
        {hasData ? (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="percent"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                yAxisId="amount"
                orientation="right"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'Break Amount') return [`\u20A6${value.toLocaleString()}`, name];
                  return [`${value}%`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="reconciliationRate"
                name="Reconciliation Rate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="breakAmount"
                name="Break Amount"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="percent"
                type="monotone"
                dataKey="autoMatchRate"
                name="Auto-Match Rate"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            No historical data available yet. Reconciliation trends will appear here after processing begins.
          </div>
        )}
      </div>
    </div>
  );
}
