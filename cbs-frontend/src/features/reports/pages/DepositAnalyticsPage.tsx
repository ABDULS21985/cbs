import { useState } from 'react';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDepositAnalytics } from '../hooks/useDepositAnalytics';
import { DepositStatsCards } from '../components/deposits/DepositStatsCards';
import { DepositMixTreemap } from '../components/deposits/DepositMixTreemap';
import { DepositGrowthTrend } from '../components/deposits/DepositGrowthTrend';
import { DepositConcentrationTable } from '../components/deposits/DepositConcentrationTable';
import { SegmentPieChart } from '../components/deposits/SegmentPieChart';
import { MaturityProfileChart } from '../components/deposits/MaturityProfileChart';
import { RolloverForecast } from '../components/deposits/RolloverForecast';
import { RateSensitivityScatter } from '../components/deposits/RateSensitivityScatter';
import { CostOfFundsTrend } from '../components/deposits/CostOfFundsTrend';
import { DepositRetentionChart } from '../components/deposits/DepositRetentionChart';

const PERIOD_OPTIONS = [
  { value: 'mtd', label: 'MTD' },
  { value: 'qtd', label: 'QTD' },
  { value: 'ytd', label: 'YTD' },
  { value: '12m', label: '12 Months' },
];

const SEGMENT_DATA = [
  { segment: 'Retail', amount: 30_240_000_000, pct: 45.0, color: '#3b82f6' },
  { segment: 'SME', amount: 16_800_000_000, pct: 25.0, color: '#8b5cf6' },
  { segment: 'Corporate', amount: 13_440_000_000, pct: 20.0, color: '#f59e0b' },
  { segment: 'Government', amount: 6_720_000_000, pct: 10.0, color: '#10b981' },
];

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
  } = useDepositAnalytics();

  const asOf = format(new Date(), 'dd MMM yyyy');

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
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* ── Stats cards ─────────────────────────────────────────── */}
        <DepositStatsCards stats={stats} isLoading={statsLoading} />

        {/* ── Mix + Growth trend ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Deposit Mix</h2>
            <DepositMixTreemap data={mix} isLoading={mixLoading} />
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Deposit Growth Trend (12M)</h2>
            <DepositGrowthTrend data={growthTrend} isLoading={growthTrendLoading} />
          </div>
        </div>

        {/* ── Concentration + Segment pie + Maturity profile ──────── */}
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
            <SegmentPieChart data={SEGMENT_DATA} />
          </div>
        </div>

        {/* ── Maturity Profile ────────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Term Deposit Maturity Profile — Next 12 Months
          </h2>
          <MaturityProfileChart buckets={maturityProfile} isLoading={maturityProfileLoading} />
        </div>

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
            Blended cost of funds by deposit type vs. CBN Monetary Policy Rate (MPR). CoF is plotted on a 0–10% scale; MPR on a separate 0–25% right axis.
          </p>
          <CostOfFundsTrend data={costOfFunds} isLoading={costOfFundsLoading} />
        </div>

        {/* ── Retention & Churn ───────────────────────────────────── */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Deposit Retention by Vintage
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Cohort retention heatmap — each cell shows the percentage of deposits from that quarterly vintage still active at each time interval. Green ≥90%, Amber 70–90%, Red &lt;70%.
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
