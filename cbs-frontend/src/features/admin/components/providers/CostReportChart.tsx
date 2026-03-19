import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CostRecord } from '../../api/providerApi';

interface CostReportChartProps {
  records: CostRecord[];
  providers: { id: string; name: string }[];
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#06b6d4', '#ef4444', '#eab308', '#ec4899',
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs max-w-48">
      <p className="font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.filter(e => e.value > 0).map(entry => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.fill }} />
          <span className="text-muted-foreground truncate">{entry.name.length > 18 ? entry.name.slice(0, 18) + '…' : entry.name}:</span>
          <span className="font-semibold ml-auto pl-2">₦{(entry.value / 1000).toFixed(0)}k</span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
        <span>Total</span>
        <span>₦{(total / 1000000).toFixed(2)}M</span>
      </div>
    </div>
  );
};

export function CostReportChart({ records, providers }: CostReportChartProps) {
  // Group by month
  const months = [...new Set(records.map(r => r.month))].sort();

  const data = months.map(month => {
    const row: Record<string, string | number> = { month };
    providers.forEach(p => {
      const rec = records.find(r => r.month === month && r.providerId === p.id);
      row[p.name] = rec?.totalCost ?? 0;
    });
    return row;
  });

  const formatYAxis = (v: number) => {
    if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}k`;
    return `₦${v}`;
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          className="fill-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="square"
          iconSize={10}
        />
        {providers.map((p, i) => (
          <Bar
            key={p.id}
            dataKey={p.name}
            stackId="cost"
            fill={COLORS[i % COLORS.length]}
            radius={i === providers.length - 1 ? [3, 3, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
