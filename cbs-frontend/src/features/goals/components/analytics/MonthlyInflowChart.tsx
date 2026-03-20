import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { GoalContribution } from '../../api/goalApi';

interface Props {
  contributions: GoalContribution[];
}

export function MonthlyInflowChart({ contributions }: Props) {
  const monthlyData: Record<string, { auto: number; manual: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { auto: 0, manual: 0 };
  }
  contributions.forEach((c) => {
    const m = c.date.slice(0, 7);
    if (monthlyData[m]) {
      if (c.type === 'AUTO') monthlyData[m].auto += c.amount;
      else monthlyData[m].manual += c.amount;
    }
  });
  const data = Object.entries(monthlyData).map(([month, v]) => ({ month: month.slice(5), ...v }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="auto" stackId="a" fill="#3b82f6" name="Auto-Debit" radius={[0, 0, 0, 0]} />
        <Bar dataKey="manual" stackId="a" fill="#22c55e" name="Manual" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
