import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { RatingDistributionItem } from '../../types/creditRisk';

interface RatingDistributionChartProps {
  data: RatingDistributionItem[];
}

const gradeColors: Record<string, string> = {
  A: '#22c55e',
  B: '#14b8a6',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
};

export function RatingDistributionChart({ data }: RatingDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        No rating distribution data available
      </div>
    );
  }

  const chartData = data.map(item => ({
    grade: item.grade,
    label: item.label,
    count: item.count,
    exposure: item.exposure,
    fill: gradeColors[item.grade] || '#94a3b8',
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="grade"
          tick={{ fontSize: 12 }}
          tickFormatter={(grade) => {
            const item = data.find(d => d.grade === grade);
            return item ? `${grade} — ${item.label}` : grade;
          }}
        />
        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => formatMoneyCompact(v)}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'exposure') return [formatMoneyCompact(value), 'Exposure'];
            return [value.toLocaleString(), 'Count'];
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="count" name="Count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="right" dataKey="exposure" name="Exposure" fill="#f97316" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
