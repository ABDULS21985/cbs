import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
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
    <div className="rounded-2xl border border-border/70 bg-popover/95 p-3 text-sm shadow-lg backdrop-blur-xl">
      <p className="font-semibold">DPD {item.bucket} days</p>
      <p className="mt-1 text-muted-foreground">
        Exposure: <span className="font-mono text-foreground">{formatMoney(item.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Cases: <span className="font-semibold text-foreground">{item.count.toLocaleString()}</span>
      </p>
    </div>
  );
}

export function DpdAgingChart({ data = [] }: DpdAgingChartProps) {
  const totalAmount = data.reduce((sum, bucket) => sum + (bucket.amount || 0), 0);
  const totalCases = data.reduce((sum, bucket) => sum + (bucket.count || 0), 0);

  return (
    <div className="lending-section-card h-full">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Collections Aging</p>
          <h3 className="mt-2 text-lg font-semibold">DPD Aging Buckets</h3>
          <p className="mt-1 text-sm text-muted-foreground">Outstanding delinquent exposure split by current arrears bucket.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="lending-hero-chip">{formatMoneyCompact(totalAmount)} exposure</div>
          <div className="lending-hero-chip">{totalCases.toLocaleString()} cases</div>
        </div>
      </div>

      <div className="mt-5 h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
              <XAxis
                type="number"
                tickFormatter={(value: number) => formatMoneyCompact(value)}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="bucket"
                tick={{ fontSize: 12 }}
                width={60}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[0, 10, 10, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/55 text-sm text-muted-foreground">
            No delinquency aging data available.
          </div>
        )}
      </div>
    </div>
  );
}
