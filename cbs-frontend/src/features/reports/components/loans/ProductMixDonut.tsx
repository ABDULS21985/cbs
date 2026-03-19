import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { ProductMix } from '../../api/loanAnalyticsApi';

interface ProductMixDonutProps {
  products: ProductMix[];
}

function ProductTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ProductMix;
  const total = payload[0].payload._total as number;
  const pct = total > 0 ? ((d.amount / total) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{d.product}</p>
      <p className="text-muted-foreground">
        Amount: <span className="text-foreground font-medium">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{pct}%</span>
      </p>
      <p className="text-muted-foreground">
        Count: <span className="text-foreground font-medium">{d.count.toLocaleString()}</span>
      </p>
      <p className="text-muted-foreground">
        NPL Ratio: <span className="text-foreground font-medium">{d.nplPct.toFixed(1)}%</span>
      </p>
    </div>
  );
}

export function ProductMixDonut({ products }: ProductMixDonutProps) {
  const total = products.reduce((s, p) => s + p.amount, 0);

  const pieData = products.map((p) => ({
    ...p,
    _total: total,
    pct: total > 0 ? ((p.amount / total) * 100).toFixed(1) : '0',
  }));

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Product Mix</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Portfolio breakdown by loan product</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <ResponsiveContainer width={240} height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={108}
                paddingAngle={2}
                dataKey="amount"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<ProductTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">Portfolio</span>
            <span className="text-lg font-bold text-foreground">{formatMoneyCompact(total)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 gap-1.5 w-full">
          {pieData.map((p) => (
            <div key={p.product} className="flex items-center gap-2.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground flex-1 truncate">{p.product}</span>
              <span className="font-semibold text-foreground tabular-nums">{p.pct}%</span>
              <span className="text-muted-foreground tabular-nums w-20 text-right">{formatMoneyCompact(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
