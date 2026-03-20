import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { RDInstallment } from '../../api/goalApi';

interface DepositProjectionChartProps {
  installments: RDInstallment[];
  installmentAmount: number;
  currency?: string;
}

export function DepositProjectionChart({ installments, installmentAmount, currency = 'NGN' }: DepositProjectionChartProps) {
  const data = useMemo(() => {
    let cumulativePlanned = 0;
    let cumulativeActual = 0;
    return installments.map((inst) => {
      cumulativePlanned += installmentAmount;
      if (inst.status === 'PAID' || inst.amountPaid > 0) {
        cumulativeActual += inst.amountPaid || installmentAmount;
      }
      return {
        label: `#${inst.installmentNumber}`,
        planned: cumulativePlanned,
        actual: cumulativeActual || null,
        dueDate: inst.dueDate,
      };
    });
  }, [installments, installmentAmount]);

  const maturityValue = installments.length * installmentAmount;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Payment Projection</h3>
          <p className="text-xs text-muted-foreground">Planned vs actual cumulative payments</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Maturity Value</p>
          <p className="font-mono font-bold">{formatMoney(maturityValue, currency)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <ReferenceLine y={maturityValue} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: 'Target', fontSize: 10 }} />
          <Line type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Planned" />
          <Line type="monotone" dataKey="actual" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ r: 2 }} name="Actual" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
