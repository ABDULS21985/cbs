import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { LiquidityStressPoint } from '../../api/marketRiskApi';

interface Props { data: LiquidityStressPoint[]; currency: string }

export function SurvivalHorizonChart({ data, currency }: Props) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Survival Horizon (30-day)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 10 }} tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Legend />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="normal" name="Normal" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="mildStress" name="Mild Stress" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="severeStress" name="Severe Stress" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
