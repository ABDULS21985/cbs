import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import type { DeliveryFailure } from '../api/notificationAnalyticsApi';

// ---------------------------------------------------------------------------
// Color palette (CBS design tokens mapped to chart colors)
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive, 0 84% 60%))',
  'hsl(40 96% 53%)',       // amber/warning
  'hsl(200 98% 39%)',      // info blue
  'hsl(280 67% 51%)',      // purple
  'hsl(160 84% 39%)',      // teal
  'hsl(15 75% 55%)',       // orange
  'hsl(330 67% 52%)',      // pink
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FailureReasonsChartProps {
  data: DeliveryFailure[] | undefined;
  isLoading: boolean;
  height?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FailureReasonsChart({ data, isLoading, height = 300 }: FailureReasonsChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const counts = new Map<string, number>();
    for (const f of data) {
      const reason = f.failureReason || 'Unknown';
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
    const total = data.length;
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value, pct: ((value / total) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }} role="status" aria-label="Loading failure reasons">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No failure data available
      </div>
    );
  }

  return (
    <div aria-label="Failure reasons breakdown chart" role="img">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, pct }) => `${name}: ${pct}%`}
            labelLine={false}
          >
            {chartData.map((_entry, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} failures`, name]}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--popover-foreground))',
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
