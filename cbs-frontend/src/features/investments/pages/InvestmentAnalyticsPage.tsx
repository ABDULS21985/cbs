import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Briefcase, Layers,
  Target, AlertTriangle, Trophy, DollarSign, Users, ShieldAlert, Lightbulb,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, EmptyState, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { usePortfolios } from '../hooks/useInvestments';
import { wealthApi } from '../api/wealthApi';

const PIE_COLORS: Record<string, string> = {
  EQUITY: '#6366f1', FIXED_INCOME: '#0ea5e9', CASH: '#22c55e',
  ALTERNATIVE: '#f59e0b', COMMODITY: '#ef4444',
};
const CHART_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

// ─── Portfolio Analytics Tab ─────────────────────────────────────────────────

function PortfolioAnalyticsTab() {
  const { data: portfolios = [], isLoading } = usePortfolios();

  const totalAum = portfolios.reduce((s: number, p: any) => s + (p.totalValue ?? 0), 0);
  const avgReturn = portfolios.length > 0 ? portfolios.reduce((s: number, p: any) => s + (p.returnYtd ?? 0), 0) / portfolios.length : 0;

  const sorted = useMemo(() => [...portfolios].sort((a: any, b: any) => (b.returnYtd ?? 0) - (a.returnYtd ?? 0)), [portfolios]);
  const topPerformers = sorted.slice(0, 5);
  const bottomPerformers = [...sorted].reverse().slice(0, 5);

  const allocationData = useMemo(() => {
    const byType: Record<string, number> = {};
    portfolios.forEach((p: any) => {
      const type = p.type ?? 'OTHER';
      byType[type] = (byType[type] ?? 0) + (p.totalValue ?? 0);
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [portfolios]);

  const perfData = useMemo(() =>
    portfolios.slice(0, 8).map((p: any) => ({
      name: (p.name ?? p.code ?? '').slice(0, 15),
      return: p.returnYtd ?? 0,
    })),
  [portfolios]);

  if (isLoading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  if (portfolios.length === 0) return <EmptyState title="No portfolio data" description="Create portfolios to see analytics." />;

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total AUM" value={totalAum} format="money" compact icon={Briefcase} />
        <StatCard label="Portfolios" value={portfolios.length} format="number" icon={Layers} />
        <StatCard label="Avg YTD Return" value={avgReturn} format="percent" icon={TrendingUp} />
        <StatCard label="Best Performer" value={topPerformers[0] ? `${(topPerformers[0] as any).returnYtd?.toFixed(1) ?? 0}%` : '—'} icon={Trophy} />
      </div>

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
                  {perfData.map((_entry: { name: string; return: number }, i: number) => <Cell key={i} fill={perfData[i].return >= 0 ? '#22c55e' : '#ef4444'} />)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Top 5 Portfolios (YTD)</h3>
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
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Bottom 5 Portfolios</h3>
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
                    <td className="py-2.5 px-3"><div className="w-32 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${weight}%`, backgroundColor: PIE_COLORS[d.name] ?? '#94a3b8' }} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Wealth Analytics Tab ────────────────────────────────────────────────────

function WealthAnalyticsTab() {
  const { data: aumTrend = [], isLoading: aumLoading } = useQuery({
    queryKey: ['wealth', 'analytics', 'aum-trend'],
    queryFn: () => wealthApi.getAumTrend(12),
    staleTime: 60_000,
  });
  const { data: concentration = [] } = useQuery({
    queryKey: ['wealth', 'analytics', 'concentration-risk'],
    queryFn: () => wealthApi.getConcentrationRisk(),
    staleTime: 60_000,
  });
  const { data: segments = [] } = useQuery({
    queryKey: ['wealth', 'analytics', 'client-segments'],
    queryFn: () => wealthApi.getClientSegments(),
    staleTime: 60_000,
  });
  const { data: feeRevenue = [] } = useQuery({
    queryKey: ['wealth', 'analytics', 'fee-revenue'],
    queryFn: () => wealthApi.getFeeRevenue(12),
    staleTime: 60_000,
  });
  const { data: insights = [] } = useQuery({
    queryKey: ['wealth', 'analytics', 'insights'],
    queryFn: () => wealthApi.getInsights(),
    staleTime: 60_000,
  });
  const { data: riskHeatmap = [] } = useQuery({
    queryKey: ['wealth', 'analytics', 'risk-heatmap'],
    queryFn: () => wealthApi.getRiskHeatmap(),
    staleTime: 60_000,
  });

  if (aumLoading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="space-y-6 p-1">
      {/* AUM Trend */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> AUM Trend (12 months)</h3>
        {aumTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={aumTrend} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [formatMoney(v), 'AUM']} />
              <Area type="monotone" dataKey="totalAum" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground text-center py-8">No AUM trend data available</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Segments */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Client Segments</h3>
          {segments.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={segments} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="clientCount" nameKey="segment" paddingAngle={2}>
                  {segments.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No segment data</p>}
        </div>

        {/* Fee Revenue */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Fee Revenue (12 months)</h3>
          {feeRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={feeRevenue} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [formatMoney(v), 'Revenue']} />
                <Bar dataKey="totalFees" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No fee data</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Concentration Risk */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-500" /> Concentration Risk</h3>
          {concentration.length > 0 ? (
            <div className="space-y-2">
              {concentration.slice(0, 8).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-32 truncate">{String(c.name ?? c.assetClass ?? `Risk ${i + 1}`)}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, Number(c.percentage ?? c.weight ?? 0))}%`,
                      backgroundColor: Number(c.percentage ?? c.weight ?? 0) > 30 ? '#ef4444' : Number(c.percentage ?? c.weight ?? 0) > 20 ? '#f59e0b' : '#22c55e',
                    }} />
                  </div>
                  <span className="text-xs font-mono font-bold w-12 text-right">{Number(c.percentage ?? c.weight ?? 0).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No concentration data</p>}
        </div>

        {/* Risk Heatmap */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Risk Heatmap</h3>
          {riskHeatmap.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {riskHeatmap.slice(0, 16).map((r: any, i: number) => {
                const level = Number(r.riskLevel ?? r.score ?? 0);
                const bg = level >= 80 ? 'bg-red-500' : level >= 60 ? 'bg-orange-400' : level >= 40 ? 'bg-amber-400' : level >= 20 ? 'bg-yellow-300' : 'bg-green-400';
                return (
                  <div key={i} className={cn('rounded-lg p-2.5 text-center', bg, 'text-white')}>
                    <p className="text-[9px] font-medium truncate">{String(r.category ?? r.name ?? '')}</p>
                    <p className="text-sm font-bold">{level}</p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No risk heatmap data</p>}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> AI Insights</h3>
          <div className="space-y-2">
            {insights.map((ins: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Lightbulb className={cn('w-4 h-4 mt-0.5 flex-shrink-0',
                  ins.severity === 'HIGH' ? 'text-red-500' : ins.severity === 'MEDIUM' ? 'text-amber-500' : 'text-blue-500')} />
                <div>
                  <p className="text-sm font-medium">{String(ins.title ?? ins.insight ?? `Insight ${i + 1}`)}</p>
                  {ins.description && <p className="text-xs text-muted-foreground mt-0.5">{String(ins.description)}</p>}
                  {ins.recommendation && <p className="text-xs text-primary mt-1">{String(ins.recommendation)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function InvestmentAnalyticsPage() {
  useEffect(() => { document.title = 'Investment Analytics | CBS'; }, []);

  return (
    <>
      <PageHeader title="Investment Analytics" subtitle="Cross-portfolio performance, allocation, wealth analytics, and risk analysis" />

      <div className="page-container space-y-6">
        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'portfolios', label: 'Portfolio Analytics', content: <PortfolioAnalyticsTab /> },
              { id: 'wealth', label: 'Wealth Analytics', content: <WealthAnalyticsTab /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
