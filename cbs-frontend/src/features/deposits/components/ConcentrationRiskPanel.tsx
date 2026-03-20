import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FixedDeposit } from '../api/fixedDepositApi';

const CONCENTRATION_THRESHOLD = 10; // 10%

interface Props {
  deposits: FixedDeposit[];
}

export function ConcentrationRiskPanel({ deposits }: Props) {
  const { top10, totalPortfolio } = useMemo(() => {
    const active = deposits.filter(d => d.status === 'ACTIVE');
    const total = active.reduce((s, d) => s + d.principalAmount, 0);

    const byCustomer = new Map<string, { name: string; count: number; value: number; avgRate: number; rateSum: number }>();
    active.forEach(d => {
      const existing = byCustomer.get(d.customerId) ?? { name: d.customerName, count: 0, value: 0, avgRate: 0, rateSum: 0 };
      existing.count++;
      existing.value += d.principalAmount;
      existing.rateSum += d.interestRate;
      existing.avgRate = existing.rateSum / existing.count;
      byCustomer.set(d.customerId, existing);
    });

    const sorted = Array.from(byCustomer.entries())
      .map(([id, data]) => ({ id, ...data, pct: total > 0 ? (data.value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { top10: sorted, totalPortfolio: total };
  }, [deposits]);

  const chartData = top10.map(c => ({ name: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name, value: c.value, pct: c.pct }));

  return (
    <div className="space-y-4">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 100, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} className="fill-muted-foreground" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} className="fill-muted-foreground" />
          <ReferenceLine x={totalPortfolio * (CONCENTRATION_THRESHOLD / 100)} stroke="#ef4444" strokeDasharray="6 4"
            label={{ value: `${CONCENTRATION_THRESHOLD}%`, position: 'top', fontSize: 10, fill: '#ef4444' }} />
          <Tooltip formatter={(v: number) => formatMoney(v)} />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">FDs</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total Value</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">% of Portfolio</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Avg Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {top10.map(c => (
              <tr key={c.id} className={cn('hover:bg-muted/20', c.pct > CONCENTRATION_THRESHOLD && 'bg-red-50/30 dark:bg-red-900/5')}>
                <td className="px-3 py-2 font-medium flex items-center gap-1.5">
                  {c.name}
                  {c.pct > CONCENTRATION_THRESHOLD && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                </td>
                <td className="px-3 py-2 text-right font-mono">{c.count}</td>
                <td className="px-3 py-2 text-right font-mono">{formatMoney(c.value)}</td>
                <td className={cn('px-3 py-2 text-right font-mono font-semibold', c.pct > CONCENTRATION_THRESHOLD ? 'text-red-600' : '')}>
                  {c.pct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono">{c.avgRate.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
