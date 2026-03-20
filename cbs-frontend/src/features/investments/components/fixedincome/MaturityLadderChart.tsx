import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { BondHolding } from '../../api/fixedIncomeApi';

interface MaturityLadderChartProps {
  holdings: BondHolding[];
}

const BUCKETS = [
  { key: 'thisMonth', label: 'This Month', maxDays: 30 },
  { key: '1-3M', label: '1-3M', maxDays: 90 },
  { key: '3-6M', label: '3-6M', maxDays: 180 },
  { key: '6-12M', label: '6-12M', maxDays: 365 },
  { key: '1-2Y', label: '1-2Y', maxDays: 730 },
  { key: '2-5Y', label: '2-5Y', maxDays: 1825 },
  { key: '5Y+', label: '5Y+', maxDays: Infinity },
];

export function MaturityLadderChart({ holdings }: MaturityLadderChartProps) {
  const data = useMemo(() => {
    const today = Date.now();
    return BUCKETS.map((bucket, i) => {
      const minDays = i === 0 ? 0 : BUCKETS[i - 1].maxDays;
      const filtered = holdings.filter((h) => {
        const days = Math.ceil((new Date(h.maturityDate).getTime() - today) / 86400000);
        return days > minDays && days <= bucket.maxDays;
      });
      const govt = filtered.filter((h) => h.issuerType === 'GOVERNMENT' || h.securityType === 'GOVERNMENT_BOND');
      const corp = filtered.filter((h) => h.issuerType !== 'GOVERNMENT' && h.securityType !== 'GOVERNMENT_BOND');
      return {
        bucket: bucket.label,
        government: govt.reduce((s, h) => s + h.faceValue, 0),
        corporate: corp.reduce((s, h) => s + h.faceValue, 0),
      };
    });
  }, [holdings]);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Maturity Ladder</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1e9).toFixed(1)}B`} />
          <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="government" name="Government" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="corporate" name="Corporate" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
