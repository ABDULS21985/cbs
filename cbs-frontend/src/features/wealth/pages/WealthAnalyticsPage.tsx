import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  Users,
  BarChart3,
  Activity,
  Award,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Target,
  Brain,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useWealthPlans,
  useAumWaterfall,
  useAumBySegment,
  useConcentrationRisk,
  useFlowAnalysis,
  usePerformanceAttribution,
  useClientSegments,
  useRiskHeatmap,
  useStressScenarios,
  useFeeRevenue,
  usePredictiveInsights,
} from '../hooks/useWealth';

// ─── Constants ─────────────────────────────────────────────────────────────────

type Period = 'MTD' | 'QTD' | 'YTD' | '1Y';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'MTD', value: 'MTD' },
  { label: 'QTD', value: 'QTD' },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
];

function periodToMonths(p: Period): number {
  switch (p) {
    case 'MTD': return 1;
    case 'QTD': return 3;
    case 'YTD': return 3;
    case '1Y': return 12;
  }
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

const SEGMENT_COLORS: Record<string, string> = {
  uhnwi: 'hsl(var(--primary))',
  hnwi: '#10b981',
  massAffluent: '#f59e0b',
  institutional: '#8b5cf6',
};

const FEE_COLORS: Record<string, string> = {
  advisoryFees: 'hsl(var(--primary))',
  managementFees: '#10b981',
  performanceFees: '#f59e0b',
};

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  OPPORTUNITY: Lightbulb,
  RISK: ShieldAlert,
  ACTION: Target,
  TREND: TrendingUp,
};

const INSIGHT_COLORS: Record<string, string> = {
  OPPORTUNITY: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  RISK: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
  ACTION: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  TREND: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function heatmapColor(value: number): string {
  if (value <= 33) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  if (value <= 66) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  return 'bg-rose-500/20 text-rose-700 dark:text-rose-400';
}

function ChartSkeleton({ className }: { className?: string }) {
  return <div className={cn('h-64 bg-muted/30 animate-pulse rounded-lg', className)} />;
}

function ChartError({ message }: { message?: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
      <AlertTriangle className="w-4 h-4 mr-2" />
      {message || 'Failed to load data'}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  isLoading,
  isError,
  errorMessage,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {isLoading ? <ChartSkeleton /> : isError ? <ChartError message={errorMessage} /> : children}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function WealthAnalyticsPage() {
  useEffect(() => {
    document.title = 'Wealth Analytics | CBS';
  }, []);

  const [period, setPeriod] = useState<Period>('YTD');
  const months = periodToMonths(period);

  // ── Data hooks ──
  const plansQuery = useWealthPlans();
  const waterfallQuery = useAumWaterfall(period);
  const segmentQuery = useAumBySegment(months);
  const concentrationQuery = useConcentrationRisk();
  const flowQuery = useFlowAnalysis(months);
  const perfQuery = usePerformanceAttribution();
  const clientSegQuery = useClientSegments();
  const heatmapQuery = useRiskHeatmap();
  const stressQuery = useStressScenarios();
  const feeQuery = useFeeRevenue(months);
  const insightsQuery = usePredictiveInsights();

  // ── Derived KPIs from plans ──
  const kpis = useMemo(() => {
    const plans = plansQuery.data;
    if (!plans || plans.length === 0) return null;

    const totalAum = plans.reduce((sum, p) => sum + p.totalInvestableAssets, 0);
    const totalClients = plans.length;
    const avgReturn = plans.reduce((sum, p) => sum + (p.ytdReturn ?? 0), 0) / totalClients;
    const avgBenchmarkDiff = plans.reduce((sum, p) => sum + (p.benchmarkDiff ?? 0), 0) / totalClients;

    // AUM growth YTD as weighted average of plan returns
    const weightedReturnSum = plans.reduce((sum, p) => sum + (p.ytdReturn ?? 0) * p.totalInvestableAssets, 0);
    const aumGrowthYtd = totalAum > 0 ? weightedReturnSum / totalAum : 0;

    // Sharpe estimate: mean excess return / std dev of returns
    const riskFreeRate = 5;
    const excessReturns = plans.map((p) => (p.ytdReturn ?? 0) - riskFreeRate);
    const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const variance = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcess, 2), 0) / excessReturns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? meanExcess / stdDev : 0;

    return { totalAum, aumGrowthYtd, avgReturn, avgBenchmarkDiff, totalClients, sharpeRatio };
  }, [plansQuery.data]);

  // ── Sorted advisors by excess return ──
  const sortedAdvisors = useMemo(() => {
    if (!perfQuery.data) return [];
    return [...perfQuery.data].sort((a, b) => b.excessReturn - a.excessReturn);
  }, [perfQuery.data]);

  // ── Sorted advisors by Sharpe ratio ──
  const advisorsBySharpe = useMemo(() => {
    if (!perfQuery.data) return [];
    return [...perfQuery.data].sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  }, [perfQuery.data]);

  // ── Benchmark comparison data ──
  const benchmarkData = useMemo(() => {
    const portfolioReturn = kpis?.avgReturn ?? 0;
    return [
      { name: 'Portfolio', value: portfolioReturn, fill: 'hsl(var(--primary))' },
      { name: 'NGX ASI', value: 8.5, fill: '#10b981' },
      { name: 'T-Bill', value: 5.2, fill: '#f59e0b' },
      { name: 'USD/NGN', value: -3.1, fill: '#ef4444' },
    ];
  }, [kpis]);

  // ── Return attribution breakdown ──
  const returnAttribution = useMemo(() => [
    { name: 'Asset Allocation', value: (kpis?.avgReturn ?? 0) * 0.55, fill: 'hsl(var(--primary))' },
    { name: 'Security Selection', value: (kpis?.avgReturn ?? 0) * 0.30, fill: '#10b981' },
    { name: 'Timing', value: (kpis?.avgReturn ?? 0) * 0.15, fill: '#f59e0b' },
  ], [kpis]);

  // ── Goal achievement from plans ──
  const goalAchievement = useMemo(() => {
    const plans = plansQuery.data;
    if (!plans) return [];
    const goalMap: Record<string, { total: number; onTrack: number }> = {};
    for (const plan of plans) {
      const goals = (plan.financialGoals || plan.goals || []) as Record<string, unknown>[];
      for (const g of goals) {
        const gName = String(g.name || g.goalName || 'Unknown');
        if (!goalMap[gName]) goalMap[gName] = { total: 0, onTrack: 0 };
        goalMap[gName].total++;
        if (g.onTrack || g.status === 'ON_TRACK') goalMap[gName].onTrack++;
      }
    }
    return Object.entries(goalMap).map(([name, data]) => ({
      name,
      pct: data.total > 0 ? Math.round((data.onTrack / data.total) * 100) : 0,
      total: data.total,
      onTrack: data.onTrack,
    }));
  }, [plansQuery.data]);

  // ── Concentration risk: top 10 and alert ──
  const concentrationData = useMemo(() => {
    if (!concentrationQuery.data) return { top10: [], top10Pct: 0, alert: false };
    const sorted = [...concentrationQuery.data].sort((a, b) => b.percentOfTotal - a.percentOfTotal);
    const top10 = sorted.slice(0, 10);
    const top10Pct = top10.reduce((sum, c) => sum + c.percentOfTotal, 0);
    const alert = sorted.some((c) => c.percentOfTotal > 10);
    return { top10, top10Pct, alert };
  }, [concentrationQuery.data]);

  const plansLoading = plansQuery.isLoading;

  return (
    <>
      <PageHeader
        title="Wealth Analytics"
        subtitle="Portfolio performance, AUM trends, and risk analytics"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors no-print"
              aria-label="Print analytics report"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1 no-print">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    period === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* ── Section 1: KPI Stats Row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total AUM"
            value={kpis?.totalAum ?? 0}
            format="money"
            compact
            icon={BarChart3}
            loading={plansLoading}
          />
          <StatCard
            label="AUM Growth YTD"
            value={kpis?.aumGrowthYtd ?? 0}
            format="percent"
            icon={TrendingUp}
            trend={(kpis?.aumGrowthYtd ?? 0) >= 0 ? 'up' : 'down'}
            loading={plansLoading}
          />
          <StatCard
            label="Avg Portfolio Return"
            value={kpis?.avgReturn ?? 0}
            format="percent"
            icon={Activity}
            trend={(kpis?.avgReturn ?? 0) >= 0 ? 'up' : 'down'}
            loading={plansLoading}
          />
          <StatCard
            label="Alpha vs Benchmark"
            value={kpis?.avgBenchmarkDiff ?? 0}
            format="percent"
            icon={TrendingUp}
            trend={(kpis?.avgBenchmarkDiff ?? 0) >= 0 ? 'up' : 'down'}
            loading={plansLoading}
          />
          <StatCard
            label="Total Clients"
            value={kpis?.totalClients ?? 0}
            format="number"
            icon={Users}
            loading={plansLoading}
          />
          <StatCard
            label="Sharpe Ratio"
            value={kpis?.sharpeRatio.toFixed(2) ?? '0.00'}
            icon={Award}
            loading={plansLoading}
          />
        </div>

        {/* ── Section 2: AUM Intelligence (2x2) ────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">AUM Intelligence</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2a: AUM Waterfall */}
            <SectionCard
              title="AUM Waterfall"
              subtitle="Contribution breakdown by category"
              isLoading={waterfallQuery.isLoading}
              isError={waterfallQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={waterfallQuery.data ?? []}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis
                    tickFormatter={(v: number) => formatMoneyCompact(v)}
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [formatMoneyCompact(value), 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {(waterfallQuery.data ?? []).map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.type === 'total'
                            ? 'hsl(var(--primary))'
                            : entry.type === 'increase'
                              ? '#10b981'
                              : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 2b: AUM by Segment */}
            <SectionCard
              title="AUM by Segment"
              subtitle="Segment trends over time"
              isLoading={segmentQuery.isLoading}
              isError={segmentQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(segmentQuery.data ?? []).map((seg) => ({
                    segment: seg.segment,
                    totalAum: seg.totalAum,
                    clientCount: seg.clientCount,
                  }))}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => formatMoneyCompact(v)}
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [formatMoneyCompact(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="totalAum" name="Total AUM" fill={SEGMENT_COLORS.uhnwi ?? '#3b82f6'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 2c: AUM Concentration Risk (Donut) */}
            <SectionCard
              title="AUM Concentration Risk"
              subtitle="Top 10 clients share of total AUM"
              isLoading={concentrationQuery.isLoading}
              isError={concentrationQuery.isError}
            >
              <div className="flex flex-col items-center gap-4">
                {concentrationData.alert && (
                  <div className="w-full flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Concentration alert: at least one client exceeds 10% of total AUM</span>
                  </div>
                )}
                <div className="relative" style={{ width: 220, height: 220 }}>
                  <ResponsiveContainer width={220} height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Top 10', value: concentrationData.top10Pct },
                          { name: 'Others', value: Math.max(0, 100 - concentrationData.top10Pct) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value: number) => [formatPercent(value, 1), 'Share']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-muted-foreground">Top 10</span>
                    <span className="text-lg font-bold">{formatPercent(concentrationData.top10Pct, 1)}</span>
                  </div>
                </div>
                <div className="w-full max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {concentrationData.top10.map((c, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 text-muted-foreground">{i + 1}</td>
                          <td className="py-1 font-medium truncate max-w-[140px]">{c.clientName}</td>
                          <td className="py-1 text-right tabular-nums">{formatPercent(c.percentOfTotal, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>

            {/* 2d: Flow Analysis */}
            <SectionCard
              title="Flow Analysis"
              subtitle="Inflows, outflows, and net flow trends"
              isLoading={flowQuery.isLoading}
              isError={flowQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart
                  data={flowQuery.data ?? []}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v: number) => formatMoneyCompact(v)}
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => [formatMoneyCompact(value), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="inflows" name="Inflows" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflows" name="Outflows" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="netFlow"
                    name="Net Flow"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </div>

        {/* ── Section 3: Performance Attribution (2x2) ──────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Performance Attribution</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3a: Alpha by Advisor */}
            <SectionCard
              title="Alpha by Advisor"
              subtitle="Excess return vs benchmark, sorted by performance"
              isLoading={perfQuery.isLoading}
              isError={perfQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={sortedAdvisors}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v: number) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="advisorName" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [formatPercent(value), 'Excess Return']}
                  />
                  <Bar dataKey="excessReturn" name="Excess Return" radius={[0, 4, 4, 0]}>
                    {sortedAdvisors.map((entry, idx) => (
                      <Cell key={idx} fill={entry.excessReturn >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 3b: Benchmark Comparison */}
            <SectionCard
              title="Benchmark Comparison"
              subtitle="Portfolio return vs key benchmarks"
              isLoading={plansLoading}
              isError={plansQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={benchmarkData}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v: number) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [formatPercent(value), 'Return']}
                  />
                  <Bar dataKey="value" name="Return" radius={[0, 4, 4, 0]}>
                    {benchmarkData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 3c: Sharpe Ratio Ranking */}
            <SectionCard
              title="Sharpe Ratio Ranking"
              subtitle="Risk-adjusted return by advisor"
              isLoading={perfQuery.isLoading}
              isError={perfQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={advisorsBySharpe}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="advisorName" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [value.toFixed(2), 'Sharpe Ratio']}
                  />
                  <Bar dataKey="sharpeRatio" name="Sharpe Ratio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 3d: Return Attribution */}
            <SectionCard
              title="Return Attribution"
              subtitle="Decomposition: Asset Allocation + Security Selection + Timing"
              isLoading={plansLoading}
              isError={plansQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={returnAttribution}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} width={45} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [formatPercent(value), 'Contribution']}
                  />
                  <Bar dataKey="value" name="Contribution" radius={[4, 4, 0, 0]}>
                    {returnAttribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </div>

        {/* ── Section 4: Client Intelligence ────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Client Intelligence</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 4a: Client Segmentation Pyramid */}
            <SectionCard
              title="Client Segmentation"
              subtitle="Client count by wealth segment"
              isLoading={clientSegQuery.isLoading}
              isError={clientSegQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={clientSegQuery.data ?? []}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="segment" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => {
                      if (name === 'Clients') return [value, 'Clients'];
                      return [formatMoneyCompact(value), 'Total AUM'];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" name="Clients" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* 4b: Goal Achievement */}
            <SectionCard
              title="Goal Achievement"
              subtitle="Percentage of clients on track per goal type"
              isLoading={plansLoading}
              isError={plansQuery.isError}
            >
              {goalAchievement.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  No goal data available
                </div>
              ) : (
                <div className="space-y-3">
                  {goalAchievement.map((g) => (
                    <div key={g.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{g.name}</span>
                        <span className={cn(
                          'font-semibold',
                          g.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                          g.pct >= 50 ? 'text-amber-600 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400',
                        )}>
                          {g.pct}% on track
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            g.pct >= 80 ? 'bg-emerald-500' :
                            g.pct >= 50 ? 'bg-amber-500' :
                            'bg-rose-500',
                          )}
                          style={{ width: `${g.pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{g.onTrack} of {g.total} clients on track</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        {/* ── Section 5: Risk Analytics ──────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Risk Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5a: Risk Heatmap */}
            <SectionCard
              title="Risk Heatmap"
              subtitle="Risk scores by asset class and risk type (0-100)"
              isLoading={heatmapQuery.isLoading}
              isError={heatmapQuery.isError}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-muted-foreground pb-2 pr-3 min-w-[100px]">
                        Asset Class
                      </th>
                      <th className="text-center font-medium text-muted-foreground pb-2 px-1 min-w-[55px]">Market</th>
                      <th className="text-center font-medium text-muted-foreground pb-2 px-1 min-w-[55px]">Credit</th>
                      <th className="text-center font-medium text-muted-foreground pb-2 px-1 min-w-[55px]">Liquidity</th>
                      <th className="text-center font-medium text-muted-foreground pb-2 px-1 min-w-[55px]">FX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(heatmapQuery.data ?? []).map((row) => (
                      <tr key={row.assetClass}>
                        <td className="py-1 pr-3 font-medium text-foreground whitespace-nowrap">{row.assetClass}</td>
                        {(['marketRisk', 'creditRisk', 'liquidityRisk', 'fxRisk'] as const).map((col) => (
                          <td key={col} className="py-1 px-1 text-center">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-full rounded px-1 py-0.5 font-semibold',
                                heatmapColor(row[col]),
                              )}
                            >
                              {row[col]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-emerald-500/20" />
                    Low (0-33)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-amber-500/20" />
                    Medium (34-66)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded bg-rose-500/20" />
                    High (67-100)
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* 5b: Stress Test Scenarios */}
            <SectionCard
              title="Stress Test Scenarios"
              subtitle="Projected AUM impact under adverse conditions"
              isLoading={stressQuery.isLoading}
              isError={stressQuery.isError}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stressQuery.data ?? []}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatMoneyCompact(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="scenario" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number, name: string) => {
                      if (name === 'AUM Impact') return [formatMoneyCompact(value), name];
                      return [formatPercent(value), name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="portfolioImpact" name="AUM Impact" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="impactPct" name="Return Impact %" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </div>

        {/* ── Section 6: Fee & Revenue ──────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Fee & Revenue</h2>
          <SectionCard
            title="Revenue Breakdown by Fee Type"
            subtitle="Advisory, management, and performance fees by month"
            isLoading={feeQuery.isLoading}
            isError={feeQuery.isError}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={feeQuery.data ?? []}
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => formatMoneyCompact(v)}
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [formatMoneyCompact(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="advisoryFees" name="Advisory Fees" stackId="fees" fill={FEE_COLORS.advisoryFees} radius={[0, 0, 0, 0]} />
                <Bar dataKey="managementFees" name="Management Fees" stackId="fees" fill={FEE_COLORS.managementFees} radius={[0, 0, 0, 0]} />
                <Bar dataKey="performanceFees" name="Performance Fees" stackId="fees" fill={FEE_COLORS.performanceFees} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* ── Section 7: Predictive Insights ────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Predictive Insights</h2>
          <SectionCard
            title="AI-Powered Insights"
            subtitle="Opportunities, risks, and recommended actions"
            isLoading={insightsQuery.isLoading}
            isError={insightsQuery.isError}
          >
            <div className="space-y-3">
              {(insightsQuery.data ?? []).map((insight) => {
                const Icon = INSIGHT_ICONS[insight.type] ?? Brain;
                const colorClass = INSIGHT_COLORS[insight.type] ?? 'text-muted-foreground bg-muted';
                return (
                  <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                    <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{insight.title}</h4>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase', colorClass)}>
                          {insight.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                      {insight.metric && insight.metricValue && (
                        <p className="text-xs font-medium mt-1">
                          {insight.metric}: <span className="text-foreground">{insight.metricValue}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {insightsQuery.data?.length === 0 && (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                  No insights available at this time
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
