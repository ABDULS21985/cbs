import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { SegmentAnalytics } from '../../types/customer';

const FALLBACK_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#22C55E', '#EF4444', '#06B6D4', '#F97316', '#EC4899'];

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 10,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
  boxShadow: '0 8px 32px hsl(224 58% 6% / 0.4)',
};

interface SegmentDistributionChartProps {
  data: SegmentAnalytics[];
  isLoading: boolean;
}

export function SegmentDistributionChart({ data, isLoading }: SegmentDistributionChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        <div className="h-72 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="gloss-panel rounded-2xl p-10 text-center text-muted-foreground text-sm">
        No segment analytics available yet.
      </div>
    );
  }

  const pieData = data.map((s, i) => ({
    name: s.name,
    value: s.customerCount,
    code: s.code,
    fill: s.colorCode || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  const barData = data
    .map((s, i) => ({
      name: s.name,
      code: s.code,
      balance: s.totalBalance,
      fill: s.colorCode || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }))
    .sort((a, b) => b.balance - a.balance);

  const handleClick = (code: string) => navigate(`/customers/segments/${code}`);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Customer Count Pie */}
      <div className="gloss-panel rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Customer Distribution
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Share of segmented customers by segment
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={95}
              paddingAngle={2}
              onClick={(entry) => handleClick(entry.code)}
              cursor="pointer"
              animationBegin={200}
              animationDuration={700}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                const total = data.reduce((s, d) => s + d.customerCount, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return [`${value.toLocaleString()} (${pct}%)`, name];
              }}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Balance Bar Chart */}
      <div className="gloss-panel rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Balance Distribution
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Total balance held per segment, sorted descending
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.4}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => formatMoneyCompact(v)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={75}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number) => [formatMoney(v), 'Total Balance']}
              contentStyle={TOOLTIP_STYLE}
            />
            <Bar
              dataKey="balance"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(entry) => handleClick(entry.code)}
              animationBegin={200}
              animationDuration={700}
            >
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} opacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
