import { useState } from 'react';
import { Loader2, PieChart, BarChart3, TrendingDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useRiskContributionPortfolio, useRiskContributionByBU } from '../hooks/useRiskExt';
import type { RiskContribution } from '../types/riskContribution';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
}

const RISK_MEASURES = ['VAR', 'EXPECTED_SHORTFALL', 'STRESS_LOSS', 'CREDIT_VAR', 'ECONOMIC_CAPITAL'] as const;

// ─── Contribution Table ──────────────────────────────────────────────────────

function ContributionTable({ items, loading }: { items: RiskContribution[]; loading: boolean }) {
  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No risk contributions found for these parameters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Position</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Measure</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Standalone</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Marginal</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Incremental</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Contribution %</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Diversification</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Correlation</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">{item.positionName || item.positionIdentifier || '—'}</p>
                  <p className="text-xs text-muted-foreground">{item.businessUnit || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {item.riskMeasure.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(item.standaloneRisk)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{fmt(item.marginalContribution)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(item.incrementalContribution)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(Math.abs(item.contributionPct || 0), 100)}%` }} />
                    </div>
                    <span className="font-mono tabular-nums text-xs font-semibold">{pct(item.contributionPct)}</span>
                  </div>
                </td>
                <td className={cn('px-4 py-3 text-right font-mono tabular-nums', item.diversificationBenefit > 0 ? 'text-green-600 dark:text-green-400' : '')}>
                  {fmt(item.diversificationBenefit)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">{item.correlationToPortfolio?.toFixed(3) ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    item.status === 'APPROVED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    item.status === 'REVIEWED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                    'bg-muted text-muted-foreground')}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function RiskContributionPage() {
  const [viewMode, setViewMode] = useState<'portfolio' | 'bu'>('portfolio');
  const [portfolioCode, setPortfolioCode] = useState('BANK-WIDE');
  const [buCode, setBuCode] = useState('RETAIL');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const portfolioQuery = useRiskContributionPortfolio(
    viewMode === 'portfolio' ? portfolioCode : '',
    viewMode === 'portfolio' ? date : '',
  );

  const buQuery = useRiskContributionByBU(
    viewMode === 'bu' ? buCode : '',
    viewMode === 'bu' ? date : '',
  );

  // Portfolio returns single item, BU returns list
  const items: RiskContribution[] = viewMode === 'portfolio'
    ? (portfolioQuery.data ? [portfolioQuery.data] : [])
    : (buQuery.data ?? []);
  const isLoading = viewMode === 'portfolio' ? portfolioQuery.isLoading : buQuery.isLoading;

  // Summary stats
  const totalPortfolioRisk = items.length > 0 ? items[0]?.totalPortfolioRisk : null;
  const totalDiversification = items.reduce((s, i) => s + (i.diversificationBenefit || 0), 0);

  return (
    <>
      <PageHeader
        title="Risk Contribution & Attribution"
        subtitle="Decompose portfolio risk into position-level marginal, incremental, and component contributions"
      />

      <div className="px-6 space-y-6 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Portfolio Risk</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(totalPortfolioRisk)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Positions</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Diversification Benefit
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{fmt(totalDiversification)}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button type="button" onClick={() => setViewMode('portfolio')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'portfolio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              By Portfolio
            </button>
            <button type="button" onClick={() => setViewMode('bu')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'bu' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              By Business Unit
            </button>
          </div>

          {viewMode === 'portfolio' && (
            <input value={portfolioCode} onChange={(e) => setPortfolioCode(e.target.value)}
              placeholder="Portfolio code" className="rounded-lg border bg-background px-3 py-1.5 text-sm w-40" />
          )}

          {viewMode === 'bu' && (
            <input value={buCode} onChange={(e) => setBuCode(e.target.value)}
              placeholder="Business unit" className="rounded-lg border bg-background px-3 py-1.5 text-sm w-40" />
          )}

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm" />
        </div>

        {/* Results Table */}
        <ContributionTable items={items} loading={isLoading} />
      </div>
    </>
  );
}
