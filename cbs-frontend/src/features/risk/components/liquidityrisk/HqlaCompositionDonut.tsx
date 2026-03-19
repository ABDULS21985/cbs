import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { HqlaItem } from '../../api/marketRiskApi';

const COLORS = { LEVEL_1: '#22c55e', LEVEL_2A: '#3b82f6', LEVEL_2B: '#f59e0b' };

interface Props { data: HqlaItem[]; currency: string }

export function HqlaCompositionDonut({ data, currency }: Props) {
  const chartData = data.map((d) => ({ name: `${d.level.replace('_', ' ')} — ${d.category}`, value: d.netValue }));
  const totalHqla = data.reduce((sum, d) => sum + d.netValue, 0);

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">HQLA Composition</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split('—')[0]} ${(percent * 100).toFixed(0)}%`}>
                {chartData.map((_entry, i) => {
                  const level = data[i]?.level || 'LEVEL_1';
                  return <Cell key={i} fill={COLORS[level] || '#94a3b8'} />;
                })}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-1 text-xs text-muted-foreground">Asset</th><th className="text-right py-1 text-xs text-muted-foreground">Gross</th><th className="text-right py-1 text-xs text-muted-foreground">Haircut</th><th className="text-right py-1 text-xs text-muted-foreground">Net</th></tr></thead>
            <tbody className="divide-y">
              {data.map((item, i) => (
                <tr key={i}><td className="py-1.5 text-xs">{item.category}</td><td className="py-1.5 text-right font-mono text-xs">{formatMoney(item.grossValue, currency)}</td><td className="py-1.5 text-right font-mono text-xs">{item.haircut}%</td><td className="py-1.5 text-right font-mono text-xs font-semibold">{formatMoney(item.netValue, currency)}</td></tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t font-semibold"><td className="py-1.5 text-xs">Total HQLA</td><td colSpan={2} /><td className="py-1.5 text-right font-mono text-xs">{formatMoney(totalHqla, currency)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
