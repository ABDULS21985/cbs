import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatPercent } from '@/lib/formatters';
import type { BondHolding } from '../../api/fixedIncomeApi';

interface YieldCurveChartProps {
  holdings: BondHolding[];
}

const TENOR_BUCKETS = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];
const TENOR_DAYS: Record<string, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '3Y': 1095, '5Y': 1825, '7Y': 2555, '10Y': 3650, '15Y': 5475, '20Y': 7300, '30Y': 10950 };

export function YieldCurveChart({ holdings }: YieldCurveChartProps) {
  const data = useMemo(() => {
    const today = Date.now();
    const govt = holdings.filter((h) => h.issuerType === 'GOVERNMENT' || h.securityType === 'GOVERNMENT_BOND');
    const corp = holdings.filter((h) => h.issuerType !== 'GOVERNMENT' && h.securityType !== 'GOVERNMENT_BOND');

    return TENOR_BUCKETS.map((tenor) => {
      const days = TENOR_DAYS[tenor];
      const tolerance = days * 0.3;

      const matchGovt = govt.filter((h) => {
        const remaining = Math.ceil((new Date(h.maturityDate).getTime() - today) / 86400000);
        return Math.abs(remaining - days) <= tolerance;
      });
      const matchCorp = corp.filter((h) => {
        const remaining = Math.ceil((new Date(h.maturityDate).getTime() - today) / 86400000);
        return Math.abs(remaining - days) <= tolerance;
      });

      const avgGovt = matchGovt.length > 0 ? matchGovt.reduce((s, h) => s + (h.purchaseYield || 0), 0) / matchGovt.length : null;
      const avgCorp = matchCorp.length > 0 ? matchCorp.reduce((s, h) => s + (h.purchaseYield || 0), 0) / matchCorp.length : null;

      return { tenor, government: avgGovt, corporate: avgCorp };
    });
  }, [holdings]);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-1">Yield Curve</h3>
      <p className="text-xs text-muted-foreground mb-4">Government vs corporate bond yields by tenor</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="tenor" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} domain={['auto', 'auto']} />
          <Tooltip formatter={(v: number | null) => v != null ? `${v.toFixed(2)}%` : '—'} contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="government" name="Government" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="corporate" name="Corporate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
