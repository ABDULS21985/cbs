import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatMoney, formatPercent } from '@/lib/formatters';

const COLORS: Record<string, string> = { EQUITY: '#6366f1', FIXED_INCOME: '#0ea5e9', CASH: '#22c55e', ALTERNATIVE: '#f59e0b', COMMODITY: '#ef4444' };

interface Props {
  holdings: { holdingType: string; currentValue?: number; instrumentName: string }[];
  currency?: string;
}

export function AllocationChart({ holdings, currency = 'NGN' }: Props) {
  const byType: Record<string, number> = {};
  holdings.forEach((h) => { byType[h.holdingType] = (byType[h.holdingType] ?? 0) + (h.currentValue ?? 0); });
  const total = Object.values(byType).reduce((s, v) => s + v, 0);
  const data = Object.entries(byType).map(([type, value]) => ({ name: type.replace(/_/g, ' '), value, pct: total > 0 ? (value / total) * 100 : 0 }));

  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No holdings data</p>;

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={220} height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((d) => <Cell key={d.name} fill={COLORS[d.name.replace(/ /g, '_')] ?? '#6b7280'} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[d.name.replace(/ /g, '_')] ?? '#6b7280' }} />
            <div>
              <p className="text-sm font-medium">{d.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatMoney(d.value, currency)} ({d.pct.toFixed(1)}%)</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConcentrationAnalysis({ holdings, currency = 'NGN' }: Props) {
  const total = holdings.reduce((s, h) => s + (h.currentValue ?? 0), 0);
  const sorted = [...holdings].sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
  const top5 = sorted.slice(0, 5);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top 5 Holdings</h4>
      {top5.map((h) => {
        const pct = total > 0 ? ((h.currentValue ?? 0) / total) * 100 : 0;
        return (
          <div key={h.instrumentName} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-28 truncate">{h.instrumentName}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-xs font-mono tabular-nums w-12 text-right">{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}
