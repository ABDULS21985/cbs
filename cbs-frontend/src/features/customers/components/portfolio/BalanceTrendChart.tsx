import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';

interface DataPoint {
  month: string;
  balance: number;
}

interface Props {
  data: DataPoint[];
  currency?: string;
}

export function BalanceTrendChart({ data, currency = 'NGN' }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Balance Trend (12 Months)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
