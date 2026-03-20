import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { FixedDeposit } from '../api/fixedDepositApi';

const TENOR_BUCKETS = [
  { label: '30 days', max: 30, color: '#3b82f6' },
  { label: '60 days', max: 60, color: '#06b6d4' },
  { label: '90 days', max: 90, color: '#10b981' },
  { label: '180 days', max: 180, color: '#84cc16' },
  { label: '365 days', max: 365, color: '#eab308' },
  { label: '>365 days', max: Infinity, color: '#f59e0b' },
];

interface Props {
  deposits: FixedDeposit[];
}

export function TenorBreakdownChart({ deposits }: Props) {
  const data = useMemo(() => {
    const active = deposits.filter(d => d.status === 'ACTIVE');
    return TENOR_BUCKETS.map(bucket => {
      const prevMax = TENOR_BUCKETS[TENOR_BUCKETS.indexOf(bucket) - 1]?.max ?? 0;
      const inBucket = active.filter(d => d.tenor > prevMax && d.tenor <= bucket.max);
      return {
        name: bucket.label,
        count: inBucket.length,
        value: inBucket.reduce((s, d) => s + d.principalAmount, 0),
        color: bucket.color,
      };
    }).filter(d => d.count > 0);
  }, [deposits]);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="count"
          label={({ name, count }) => `${name}: ${count}`}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload as typeof data[0];
          const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
          return (
            <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
              <p className="font-semibold">{d.name}</p>
              <p>Count: <strong>{d.count}</strong> ({pct}%)</p>
              <p>Value: <strong>{formatMoney(d.value)}</strong></p>
            </div>
          );
        }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
