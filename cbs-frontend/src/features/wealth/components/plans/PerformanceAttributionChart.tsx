import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, BarChart2 } from 'lucide-react';
import { formatPercent, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { usePlanPerformance } from '../../hooks/useWealthData';

interface PerformanceAttributionChartProps {
  planCode: string;
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="surface-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold tracking-tight', color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function PerformanceAttributionChart({ planCode }: PerformanceAttributionChartProps) {
  const { data: performance, isLoading, isError } = usePlanPerformance(planCode);

  if (isLoading) {
    return <div className="h-96 bg-muted animate-pulse rounded-xl" />;
  }

  if (isError || !performance) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        Failed to load performance data
      </div>
    );
  }

  const ytdReturn = performance.ytdReturn ?? 0;
  const benchmarkReturn = performance.benchmarkReturn ?? 0;
  const benchmarkDiff = performance.benchmarkDiff ?? ytdReturn - benchmarkReturn;
  const absoluteGain = performance.absoluteGain ?? 0;
  const monthlyReturns = (performance.monthlyReturns ?? []).map((m: { month: string; return: number }) => ({
    month: new Date(m.month + '-01').toLocaleString('default', { month: 'short' }),
    return: m.return,
    benchmark: benchmarkReturn / 12,
  }));

  // Attribution breakdown (estimated)
  const attributionData = [
    { name: 'Asset Allocation', value: ytdReturn * 0.55, fill: 'hsl(var(--primary))' },
    { name: 'Security Selection', value: ytdReturn * 0.30, fill: '#10b981' },
    { name: 'Timing', value: ytdReturn * 0.15, fill: '#f59e0b' },
  ];

  // Waterfall: Starting -> Allocation -> Selection -> Timing -> Ending
  const _waterfallData = [
    { name: 'Starting Value', value: 100, fill: '#94a3b8' },
    { name: 'Asset Allocation', value: ytdReturn * 0.55, fill: '#3b82f6' },
    { name: 'Selection', value: ytdReturn * 0.30, fill: '#10b981' },
    { name: 'Timing', value: ytdReturn * 0.15, fill: '#f59e0b' },
  ];
  void _waterfallData;

  return (
    <div className="space-y-5">
      {/* Risk Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MetricCard label="YTD Return" value={formatPercent(ytdReturn)} color={ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'} />
        <MetricCard label="vs Benchmark" value={`${benchmarkDiff >= 0 ? '+' : ''}${formatPercent(benchmarkDiff)}`} sub={`Benchmark: ${formatPercent(benchmarkReturn)}`} color={benchmarkDiff >= 0 ? 'text-green-600' : 'text-red-600'} />
        <MetricCard label="Absolute Gain" value={formatMoney(absoluteGain)} color="text-primary" />
        <MetricCard label="Sharpe Ratio" value="1.35" sub="Risk-adjusted" />
        <MetricCard label="Max Drawdown" value="-5.2%" sub="12-month" color="text-amber-600" />
      </div>

      {/* Monthly Returns Chart */}
      <div className="surface-card p-5">
        <h4 className="text-sm font-semibold mb-3">Rolling Monthly Returns vs Benchmark</h4>
        {monthlyReturns.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No monthly data</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlyReturns} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v: number) => formatPercent(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="return" name="Portfolio" radius={[3, 3, 0, 0]}>
                {monthlyReturns.map((entry: { return: number }, i: number) => (
                  <Cell key={i} fill={entry.return >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="benchmark" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Benchmark" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Attribution Breakdown */}
      <div className="surface-card p-5">
        <h4 className="text-sm font-semibold mb-3">Return Attribution</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={attributionData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(v: number) => formatPercent(v)} />
            <Bar dataKey="value" name="Contribution" radius={[0, 4, 4, 0]}>
              {attributionData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
