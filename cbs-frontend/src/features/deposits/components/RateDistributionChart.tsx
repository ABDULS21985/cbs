import { useMemo } from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { FixedDeposit, RateTable } from '../api/fixedDepositApi';

const RATE_BANDS = [
  { label: '<3%', min: 0, max: 3, color: '#3b82f6' },
  { label: '3-5%', min: 3, max: 5, color: '#06b6d4' },
  { label: '5-7%', min: 5, max: 7, color: '#10b981' },
  { label: '7-10%', min: 7, max: 10, color: '#84cc16' },
  { label: '10-15%', min: 10, max: 15, color: '#eab308' },
  { label: '>15%', min: 15, max: Infinity, color: '#f59e0b' },
];

interface Props {
  deposits: FixedDeposit[];
  rateTable?: RateTable[];
}

export function RateDistributionChart({ deposits, rateTable = [] }: Props) {
  const data = useMemo(() => {
    const active = deposits.filter(d => d.status === 'ACTIVE');
    return RATE_BANDS.map(band => {
      const inBand = active.filter(d => d.interestRate >= band.min && d.interestRate < band.max);
      // Find standard rate for this band midpoint
      const midpoint = band.max === Infinity ? band.min + 5 : (band.min + band.max) / 2;
      const matchingRate = rateTable.find(r => r.standardRate >= band.min && r.standardRate < band.max);
      return {
        name: band.label,
        count: inBand.length,
        value: inBand.reduce((s, d) => s + d.principalAmount, 0),
        standardRate: matchingRate?.standardRate ?? null,
        color: band.color,
      };
    });
  }, [deposits, rateTable]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, left: 20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis yAxisId="count" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis yAxisId="value" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
          tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} className="fill-muted-foreground" />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload as typeof data[0];
          return (
            <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
              <p className="font-semibold">{d.name}</p>
              <p>FDs: <strong>{d.count}</strong></p>
              <p>Value: <strong>{formatMoney(d.value)}</strong></p>
            </div>
          );
        }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="count" dataKey="count" name="FD Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Line yAxisId="value" type="monotone" dataKey="value" name="Total Value" stroke="#ef4444" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
