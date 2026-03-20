import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { FixedDeposit } from '../api/fixedDepositApi';

const BUCKETS = [
  { key: 'thisWeek', label: 'This Week', maxDays: 7, color: '#ef4444' },
  { key: 'nextWeek', label: 'Next Week', maxDays: 14, color: '#f97316' },
  { key: '2to4Weeks', label: '2-4 Weeks', maxDays: 28, color: '#f59e0b' },
  { key: '1to3Months', label: '1-3 Months', maxDays: 90, color: '#eab308' },
  { key: '3to6Months', label: '3-6 Months', maxDays: 180, color: '#84cc16' },
  { key: '6to12Months', label: '6-12 Months', maxDays: 365, color: '#22c55e' },
  { key: 'over12Months', label: '>12 Months', maxDays: Infinity, color: '#10b981' },
];

interface Props {
  deposits: FixedDeposit[];
  onBucketClick?: (bucket: string) => void;
}

export function MaturityLadderChart({ deposits, onBucketClick }: Props) {
  const data = useMemo(() => {
    const now = Date.now();
    const active = deposits.filter(d => d.status === 'ACTIVE');

    return BUCKETS.map(bucket => {
      const prevMax = BUCKETS[BUCKETS.indexOf(bucket) - 1]?.maxDays ?? 0;
      const inBucket = active.filter(d => {
        const days = Math.ceil((new Date(d.maturityDate).getTime() - now) / 86400000);
        return days > prevMax && days <= bucket.maxDays;
      });
      return {
        name: bucket.label,
        count: inBucket.length,
        value: inBucket.reduce((s, d) => s + d.principalAmount, 0),
        color: bucket.color,
      };
    });
  }, [deposits]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <Tooltip content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload as typeof data[0];
          return (
            <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
              <p className="font-semibold mb-1">{d.name}</p>
              <p>Count: <strong>{d.count}</strong></p>
              <p>Value: <strong>{formatMoney(d.value)}</strong></p>
            </div>
          );
        }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer"
          onClick={(d) => onBucketClick?.(d.name)}>
          {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
