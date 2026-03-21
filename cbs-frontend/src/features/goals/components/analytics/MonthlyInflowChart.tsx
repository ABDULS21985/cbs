import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { GoalTransaction } from '../../api/goalApi';

interface Props {
  contributions: GoalTransaction[];
}

export function MonthlyInflowChart({ contributions }: Props) {
  const monthlyData: Record<string, { deposit: number; withdrawal: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { deposit: 0, withdrawal: 0 };
  }
  contributions.forEach((c) => {
    const m = c.createdAt.slice(0, 7);
    if (monthlyData[m]) {
      if (c.transactionType === 'DEPOSIT' || c.transactionType === 'INTEREST') {
        monthlyData[m].deposit += c.amount;
      } else if (c.transactionType === 'WITHDRAWAL') {
        monthlyData[m].withdrawal += c.amount;
      }
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
        <Bar dataKey="deposit" stackId="a" fill="#22c55e" name="Deposits" radius={[0, 0, 0, 0]} />
        <Bar dataKey="withdrawal" stackId="a" fill="#f59e0b" name="Withdrawals" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
