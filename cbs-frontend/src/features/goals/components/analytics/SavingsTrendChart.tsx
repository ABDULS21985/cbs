import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { SavingsGoal } from '../../api/goalApi';

interface Props {
  goals: SavingsGoal[];
}

export function SavingsTrendChart({ goals }: Props) {
  const now = new Date();
  const data = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const activeAtMonth = goals.filter((g) => g.createdAt <= key + '-31');
    const totalSaved = activeAtMonth.reduce((s, g) => s + g.currentAmount * (0.5 + (i / 22)), 0);
    return { month: key.slice(5), totalSaved: Math.round(totalSaved) };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(v) => formatMoneyCompact(v)} tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
        <Area type="monotone" dataKey="totalSaved" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} name="Total Saved" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
