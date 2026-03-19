import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { DpdBucket } from '../../api/loanAnalyticsApi';

interface DpdAgingChartProps {
  buckets: DpdBucket[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DpdBucket;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Count: <span className="text-foreground font-medium">{d.count.toLocaleString()}</span>
      </p>
      <p className="text-muted-foreground">
        Amount: <span className="text-foreground font-medium">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Portfolio: <span className="text-foreground font-medium">{d.portfolioPct.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">
        Provision: <span className="text-foreground font-medium">{formatMoneyCompact(d.provision)}</span>
      </p>
      <p className="text-muted-foreground">
        Coverage: <span className="text-foreground font-medium">{d.coveragePct.toFixed(1)}%</span>
      </p>
    </div>
  );
}

export function DpdAgingChart({ buckets }: DpdAgingChartProps) {
  const chartData = buckets.map((b) => ({
    ...b,
    displayAmount: b.amount / 1e9,
  }));

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">DPD Aging Distribution</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Loan balance by days past due bucket (₦B)</p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 16, bottom: 4, left: 4 }}
          barSize={36}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `₦${v.toFixed(0)}B`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
          <Bar dataKey="displayAmount" name="Amount" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="portfolioPct"
              position="top"
              formatter={(v: number) => `${v.toFixed(0)}%`}
              style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {buckets.map((b) => (
          <span key={b.bucket} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: b.color }} />
            {b.bucket}
          </span>
        ))}
      </div>
    </div>
  );
}
