import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { VarByRiskFactor as VarByRiskFactorType } from '../../api/marketRiskApi';

interface Props { data: VarByRiskFactorType[]; currency: string }

export function VarByRiskFactor({ data, currency }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">VaR by Risk Factor</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="factor" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Legend />
            <Bar dataKey="standaloneVar" name="Standalone" fill="#3b82f6" />
            <Bar dataKey="diversifiedVar" name="Diversified" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
