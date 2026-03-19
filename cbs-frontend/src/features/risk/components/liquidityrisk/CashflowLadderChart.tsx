import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { CashflowBucket } from '../../api/marketRiskApi';

interface Props { data: CashflowBucket[]; currency: string }

export function CashflowLadderChart({ data, currency }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Cashflow Ladder (Gap Analysis)</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Legend />
            <Bar dataKey="inflows" name="Inflows" fill="#22c55e" stackId="flow" />
            <Bar dataKey="outflows" name="Outflows" fill="#ef4444" stackId="flow" />
            <Line type="monotone" dataKey="cumulativeGap" name="Cumulative Gap" stroke="#3b82f6" strokeWidth={2} dot />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
