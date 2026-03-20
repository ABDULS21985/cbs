import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Briefcase, Layers,
  Target, AlertTriangle, Trophy,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, EmptyState } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { usePortfolios, usePortfolioHoldings } from '../hooks/useInvestments';

const PIE_COLORS: Record<string, string> = {
  EQUITY: '#6366f1', FIXED_INCOME: '#0ea5e9', CASH: '#22c55e',
  ALTERNATIVE: '#f59e0b', COMMODITY: '#ef4444',
};
const CHART_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export function InvestmentAnalyticsPage() {
  useEffect(() => { document.title = 'Investment Analytics | CBS'; }, []);

  const { data: portfolios = [], isLoading } = usePortfolios();

  const totalAum = portfolios.reduce((s: number, p: any) => s + (p.totalValue ?? 0), 0);
  const avgReturn = portfolios.length > 0 ? portfolios.reduce((s: number, p: any) => s + (p.returnYtd ?? 0), 0) / portfolios.length : 0;

  // Top/bottom performers
  const sorted = useMemo(() => [...portfolios].sort((a: any, b: any) => (b.returnYtd ?? 0) - (a.returnYtd ?? 0)), [portfolios]);
  const topPerformers = sorted.slice(0, 5);
  const bottomPerformers = [...sorted].reverse().slice(0, 5);

  // Aggregate allocation (simulated from portfolio types)
  const allocationData = useMemo(() => {
    const byType: Record<string, number> = {};
    portfolios.forEach((p: any) => {
      const type = p.type ?? 'OTHER';
      byType[type] = (byType[type] ?? 0) + (p.totalValue ?? 0);
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [portfolios]);

  // Performance comparison
  const perfData = useMemo(() =>
    portfolios.slice(0, 8).map((p: any) => ({
      name: (p.name ?? p.code ?? '').slice(0, 15),
      return: p.returnYtd ?? 0,
    })),
  [portfolios]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Investment Analytics" />
        <div className="page-container"><div className="h-64 rounded-xl bg-muted animate-pulse" /></div>
      </>
    );
  }

  if (portfolios.length === 0) {
    return (
      <>
        <PageHeader title="Investment Analytics" />
        <div className="page-container">
          <EmptyState title="No portfolio data" description="Create portfolios to see analytics." />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Investment Analytics" subtitle="Cross-portfolio performance, allocation, and risk analysis" />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total AUM" value={totalAum} format="money" compact icon={Briefcase} />
          <StatCard label="Portfolios" value={portfolios.length} format="number" icon={Layers} />
          <StatCard label="Avg YTD Return" value={avgReturn} format="percent" icon={TrendingUp} />
          <StatCard label="Best Performer" value={topPerformers[0] ? `${(topPerformers[0] as any).returnYtd?.toFixed(1) ?? 0}%` : '—'} icon={Trophy} />
        </div>

        {/* Row 1: Performance + Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Portfolio Returns Comparison (YTD)</h3>
            {perfData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={perfData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'YTD Return']} />
                  <Bar dataKey="return" name="YTD Return" radius={[4, 4, 0, 0]}>
                    {perfData.map((_, i) => <Cell key={i} fill={perfData[i].return >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No performance data</p>}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Aggregate Allocation</h3>
            {allocationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={2}>
                    {allocationData.map((d) => <Cell key={d.name} fill={PIE_COLORS[d.name] ?? CHART_COLORS[allocationData.indexOf(d) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No allocation data</p>}
          </div>
        </div>

        {/* Row 2: Top/Bottom Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Top 5 Portfolios (YTD)
            </h3>
            <div className="space-y-2">
              {topPerformers.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-green-50/30 dark:bg-green-900/5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <span className="text-sm font-medium truncate">{p.name ?? p.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-green-600">{(p.returnYtd ?? 0) >= 0 ? '+' : ''}{(p.returnYtd ?? 0).toFixed(2)}%</span>
                    <p className="text-[10px] text-muted-foreground">{formatMoney(p.totalValue ?? 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" /> Bottom 5 Portfolios (Attention Needed)
            </h3>
            <div className="space-y-2">
              {bottomPerformers.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-red-50/30 dark:bg-red-900/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium truncate">{p.name ?? p.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-red-600">{(p.returnYtd ?? 0) >= 0 ? '+' : ''}{(p.returnYtd ?? 0).toFixed(2)}%</span>
                    <p className="text-[10px] text-muted-foreground">{formatMoney(p.totalValue ?? 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Asset class breakdown */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Allocation Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Asset Class</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Total Value</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Weight</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Distribution</th>
              </tr></thead>
              <tbody className="divide-y">
                {allocationData.map((d) => {
                  const weight = totalAum > 0 ? (d.value / totalAum) * 100 : 0;
                  return (
                    <tr key={d.name}>
                      <td className="py-2.5 px-3 text-xs font-medium">{d.name.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">{formatMoney(d.value)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold">{weight.toFixed(1)}%</td>
                      <td className="py-2.5 px-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${weight}%`, backgroundColor: PIE_COLORS[d.name] ?? '#94a3b8' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
