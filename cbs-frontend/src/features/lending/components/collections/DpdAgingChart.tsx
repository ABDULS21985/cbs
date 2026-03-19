import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { formatMoneyCompact, formatMoney } from '@/lib/formatters';
import type { DpdAging } from '../../types/collections';

interface DpdAgingChartProps {
  data?: DpdAging[];
}

const BUCKET_COLORS: Record<string, string> = {
  '1-30': '#3b82f6',
  '31-60': '#f59e0b',
  '61-90': '#f97316',
  '91-180': '#ef4444',
  '180+': '#7f1d1d',
};

interface TooltipPayload {
  payload: DpdAging;
  value: number;
  name: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">DPD {item.bucket} days</p>
      <p className="text-muted-foreground">Amount: <span className="text-foreground font-mono">{formatMoney(item.amount)}</span></p>
      <p className="text-muted-foreground">Cases: <span className="text-foreground font-semibold">{item.count.toLocaleString()}</span></p>
    </div>
  );
}

export function DpdAgingChart({ data = [] }: DpdAgingChartProps) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">DPD Aging Buckets</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tickFormatter={(v: number) => formatMoneyCompact(v)}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="bucket"
            tick={{ fontSize: 12 }}
            width={56}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="amount" name="Outstanding Amount" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={BUCKET_COLORS[entry.bucket] ?? '#6b7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
