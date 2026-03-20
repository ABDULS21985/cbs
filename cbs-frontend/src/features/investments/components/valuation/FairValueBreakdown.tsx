import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/formatters';

const PIE_COLORS = ['#22c55e', '#0ea5e9', '#f59e0b'];

interface Props {
  level1: number;
  level2: number;
  level3: number;
  currency?: string;
}

export function FairValueBreakdown({ level1, level2, level3, currency = 'NGN' }: Props) {
  const data = [
    { name: 'Level 1 (Market)', value: level1 },
    { name: 'Level 2 (Observable)', value: level2 },
    { name: 'Level 3 (Unobservable)', value: level3 },
  ].filter((d) => d.value > 0);

  const total = level1 + level2 + level3;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No fair value data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">IFRS 13 Fair Value Hierarchy</h3>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-3 min-w-[200px]">
          {[
            { label: 'Level 1', value: level1, color: PIE_COLORS[0], desc: 'Quoted prices in active markets' },
            { label: 'Level 2', value: level2, color: PIE_COLORS[1], desc: 'Observable inputs' },
            { label: 'Level 3', value: level3, color: PIE_COLORS[2], desc: 'Unobservable inputs' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full mt-0.5" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-sm font-medium">{item.label}: {formatMoney(item.value, currency)}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
                <p className="text-xs text-muted-foreground">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}% of total</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
