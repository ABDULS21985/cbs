import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { SavingsGoal } from '../../api/goalApi';

interface Props {
  goals: SavingsGoal[];
}

export function GoalCompletionRateChart({ goals }: Props) {
  const now = new Date();
  const data = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const matured = goals.filter((g) => g.targetDate.startsWith(key));
    const completed = matured.filter((g) => g.status === 'COMPLETED');
    const rate = matured.length > 0 ? (completed.length / matured.length) * 100 : 0;
    return { month: key.slice(5), rate: Math.round(rate) };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: '80% target', fontSize: 10, fill: '#f59e0b' }} />
        <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Completion Rate" />
      </LineChart>
    </ResponsiveContainer>
  );
}
