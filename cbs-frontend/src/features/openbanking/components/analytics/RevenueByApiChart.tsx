import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';

interface DataPoint {
  product: string;
  revenue: number;
}

interface RevenueByApiChartProps {
  data: DataPoint[];
  currency?: string;
  loading?: boolean;
}

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(187, 80%, 42%)',
  'hsl(330, 81%, 60%)',
  'hsl(25, 95%, 53%)',
];

export function RevenueByApiChart({
  data,
  currency = 'NGN',
  loading,
}: RevenueByApiChartProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.revenue - a.revenue),
    [data],
  );

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-72 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Revenue by API Product</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => formatMoney(v, currency)}
          />
          <YAxis
            type="category"
            dataKey="product"
            width={120}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: 12,
            }}
            formatter={(value: number) => [formatMoney(value, currency), 'Revenue']}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
            {sorted.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
