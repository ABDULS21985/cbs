import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { SegmentAnalytics } from '../../types/customer';

const FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

interface SegmentDistributionChartProps {
  data: SegmentAnalytics[];
  isLoading: boolean;
}

export function SegmentDistributionChart({ data, isLoading }: SegmentDistributionChartProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
        No segment analytics available
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
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Customer Distribution</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              onClick={(entry) => handleClick(entry.code)}
              cursor="pointer"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                const total = data.reduce((s, d) => s + d.customerCount, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return [`${value.toLocaleString()} (${pct}%)`, name];
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Balance Bar Chart */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Balance Distribution</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => formatMoneyCompact(v)}
            />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
            <Tooltip
              formatter={(v: number) => [formatMoney(v), 'Total Balance']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="balance"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(entry) => handleClick(entry.code)}
            >
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
