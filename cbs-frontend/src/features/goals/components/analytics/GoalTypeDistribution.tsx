import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_PALETTE_EXTENDED, getChartColor } from '@/lib/chartPalette';
import { formatMoneyCompact } from '@/lib/formatters';
import type { SavingsGoal } from '../../api/goalApi';
const ICON_MAP: Record<string, string> = { '🏠': 'Home', '🎓': 'Education', '🚗': 'Vehicle', '🏥': 'Emergency', '✈️': 'Travel', '💰': 'Savings', '🎯': 'Other' };

interface Props {
  goals: SavingsGoal[];
}

export function GoalTypeDistribution({ goals }: Props) {
  const byType: Record<string, { count: number; totalTarget: number }> = {};
  goals.forEach((g) => {
    const type = ICON_MAP[g.goalIcon ?? ''] ?? g.goalIcon ?? 'Other';
    if (!byType[type]) byType[type] = { count: 0, totalTarget: 0 };
    byType[type].count++;
    byType[type].totalTarget += g.targetAmount;
  });

  const data = Object.entries(byType).map(([name, v]) => ({
    name,
    value: v.count,
    avgTarget: v.totalTarget / v.count,
  }));

  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No goals</p>;

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE_EXTENDED[i % CHART_PALETTE_EXTENDED.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="chart-legend-dot" style={{ backgroundColor: getChartColor(i) }} />
            <div>
              <p className="text-sm font-medium">{d.name} ({d.value})</p>
              <p className="text-[10px] text-muted-foreground">Avg target: {formatMoneyCompact(d.avgTarget)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
