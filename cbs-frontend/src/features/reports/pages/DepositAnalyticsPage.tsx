import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDepositAnalytics } from '../hooks/useDepositAnalytics';
import { DepositStatsCards } from '../components/deposits/DepositStatsCards';
import { DepositMixTreemap } from '../components/deposits/DepositMixTreemap';
import { DepositGrowthTrend } from '../components/deposits/DepositGrowthTrend';
import { DepositConcentrationTable } from '../components/deposits/DepositConcentrationTable';
import { MaturityProfileChart } from '../components/deposits/MaturityProfileChart';
import { RolloverForecast } from '../components/deposits/RolloverForecast';
import { RateSensitivityScatter } from '../components/deposits/RateSensitivityScatter';
import { CostOfFundsTrend } from '../components/deposits/CostOfFundsTrend';
import { DepositRetentionChart } from '../components/deposits/DepositRetentionChart';
import { DepositStabilityGauge, type StabilityFactor } from '../components/deposits/DepositStabilityGauge';
import { MaturityRolloverChart, type MaturityRolloverRow } from '../components/deposits/MaturityRolloverChart';

const PERIOD_OPTIONS = [
  { value: 'mtd', label: 'MTD' },
  { value: 'qtd', label: 'QTD' },
  { value: 'ytd', label: 'YTD' },
  { value: '12m', label: '12 Months' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStabilityScore(stats: any): number {
  if (!stats) return 0;
  // Composite score based on retention rate, cost of funds, and deposit mix
  const retentionScore = Math.min(stats.retentionRate || 0, 100) * 0.4;
  const cofScore = Math.max(0, (10 - (stats.costOfFunds || 0)) / 10) * 100 * 0.3;
  const sizeScore = Math.min((stats.total || 0) / 5e12, 1) * 100 * 0.3;
  return Math.round(retentionScore + cofScore + sizeScore);
}

function buildStabilityFactors(stats: any): StabilityFactor[] {
  if (!stats) return [];
  return [
    {
      name: 'Retention Rate',
      contribution: stats.retentionRate >= 85 ? 12.5 : stats.retentionRate >= 70 ? 5.0 : -8.0,
      status: stats.retentionRate >= 85 ? 'positive' : stats.retentionRate >= 70 ? 'neutral' : 'negative',
    },
    {
      name: 'Cost of Funds',
      contribution: stats.costOfFunds <= 4 ? 10.0 : stats.costOfFunds <= 6 ? 3.0 : -5.0,
      status: stats.costOfFunds <= 4 ? 'positive' : stats.costOfFunds <= 6 ? 'neutral' : 'negative',
    },
    {
      name: 'Deposit Growth',
      contribution: stats.newDepositsMTD > 0 ? 8.0 : -3.0,
      status: stats.newDepositsMTD > 0 ? 'positive' : 'negative',
    },
    {
      name: 'CASA Ratio',
      contribution: (stats.savings + stats.current) / (stats.total || 1) > 0.6 ? 10.0 : 2.0,
      status: (stats.savings + stats.current) / (stats.total || 1) > 0.6 ? 'positive' : 'neutral',
    },
  ];
}

function buildRolloverData(maturityProfile: any[]): MaturityRolloverRow[] {
  if (!maturityProfile || maturityProfile.length === 0) return [];
  return maturityProfile.map((bucket: any) => {
    const rolloverRate = bucket.rolloverPct || 70;
    const predictedRollover = bucket.amount * (rolloverRate / 100);
    const predictedWithdrawal = bucket.amount - predictedRollover;
    return {
      month: bucket.month,
      maturing: bucket.amount,
      predictedRollover,
      predictedWithdrawal,
      rolloverRatePct: rolloverRate,
      liquidityRisk: rolloverRate < 60,
    };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DepositAnalyticsPage() {
  const [period, setPeriod] = useState('12m');

  const {
    stats,
    statsLoading,
    mix,
    mixLoading,
    growthTrend,
    growthTrendLoading,
    topDepositors,
    topDepositorsLoading,
    maturityProfile,
    maturityProfileLoading,
    rateBands,
    rateSensitivity,
    rateSensitivityLoading,
    costOfFunds,
    costOfFundsLoading,
    retentionVintage,
    retentionVintageLoading,
    churnStats,
    churnLoading,
    hasLoadError,
  } = useDepositAnalytics();

  const asOf = format(new Date(), 'dd MMM yyyy');

  // Derived data
  const stabilityScore = useMemo(() => computeStabilityScore(stats), [stats]);
  const stabilityFactors = useMemo(() => buildStabilityFactors(stats), [stats]);
  const rolloverData = useMemo(() => buildRolloverData(maturityProfile), [maturityProfile]);

  return (
    <>
      <PageHeader
        title="Deposit Analytics"
        subtitle={`As of ${asOf} · All figures in NGN`}
        actions={
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    period === opt.value
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Export button */}
            <button
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              aria-label="Export deposit analytics"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {hasLoadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            One or more deposit-analytics datasets could not be loaded from the backend.
          </div>
        )}

        {/* ── Stats cards ─────────────────────────────────────────── */}
        <DepositStatsCards stats={stats} isLoading={statsLoading} />

        {/* ── Stability Gauge + Mix ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DepositStabilityGauge
            score={stabilityScore}
            factors={stabilityFactors}
            isLoading={statsLoading}
          />
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Deposit Mix</h2>
            <DepositMixTreemap data={mix} isLoading={mixLoading} />
          </div>
        </div>

        {/* ── Growth trend ─────────────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Deposit Growth Trend (12M)</h2>
          <DepositGrowthTrend data={growthTrend} isLoading={growthTrendLoading} />
        </div>

        {/* ── Concentration + Segment ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: concentration table (takes 2 cols) */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Deposit Concentration — Top 20 Depositors
            </h2>
            <DepositConcentrationTable
              depositors={topDepositors}
              isLoading={topDepositorsLoading}
            />
          </div>

          {/* Right: segment pie */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Deposits by Segment</h2>
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              Backend segment-distribution data is not exposed for this page yet, so no synthetic chart is shown.
            </div>
          </div>
        </div>

        {/* ── Maturity Profile ────────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Term Deposit Maturity Profile — Next 12 Months
          </h2>
          <MaturityProfileChart buckets={maturityProfile} isLoading={maturityProfileLoading} />
        </div>

        {/* ── Maturity Rollover Chart (new) ────────────────────────── */}
        <MaturityRolloverChart
          data={rolloverData}
          isLoading={maturityProfileLoading}
        />

        {/* ── Rollover Forecast ───────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Rollover Forecast</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Expected deposit renewal rates based on historical rollover behaviour and current rate environment.
          </p>
          <RolloverForecast buckets={maturityProfile} isLoading={maturityProfileLoading} />
        </div>

        {/* ── Rate Sensitivity ────────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Rate Sensitivity Analysis
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Scatter plot of 200 sampled deposit accounts by size vs. contracted rate. Top-right quadrant represents high-value, high-rate accounts most sensitive to rate changes.
          </p>
          <RateSensitivityScatter
            data={rateSensitivity}
            rateBands={rateBands}
            isLoading={rateSensitivityLoading}
          />
        </div>

        {/* ── Cost of Funds Trend ─────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Cost of Funds Trend (12M)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Blended cost of funds by deposit type vs. CBN Monetary Policy Rate (MPR). CoF is plotted on a 0-10% scale; MPR on a separate 0-25% right axis.
          </p>
          <CostOfFundsTrend data={costOfFunds} isLoading={costOfFundsLoading} />
        </div>

        {/* ── Retention & Churn ───────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Deposit Retention by Vintage
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Cohort retention heatmap — each cell shows the percentage of deposits from that quarterly vintage still active at each time interval. Green &gt;=90%, Amber 70-90%, Red &lt;70%.
          </p>
          <DepositRetentionChart
            data={retentionVintage}
            churnStats={churnStats}
            isLoading={retentionVintageLoading || churnLoading}
          />
        </div>
      </div>
    </>
  );
}
