import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { LossByCategory } from '../../api/opriskApi';

interface Props { data: LossByCategory[]; currency: string }

export function LossDistributionChart({ data, currency }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Loss Distribution by Category</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="category" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Bar dataKey="totalLoss" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
