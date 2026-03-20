import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DollarSign, Briefcase, TrendingUp, ArrowUpRight, BarChart3, Calculator, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { usePortfolioDetail, usePortfolioHoldings, useValuatePortfolio, useInvestmentValuations, useAccountingSummary } from '../hooks/useInvestments';
import { HoldingsTable } from '../components/portfolio/HoldingsTable';
import { AllocationChart, ConcentrationAnalysis } from '../components/portfolio/AllocationChart';
import { AddHoldingSheet } from '../components/portfolio/AddHoldingSheet';

export function PortfolioDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [showAddHolding, setShowAddHolding] = useState(false);

  const { data: portfolio, isLoading } = usePortfolioDetail(code ?? '');
  const { data: holdings = [], isLoading: holdingsLoading } = usePortfolioHoldings(code ?? '');
  const valuateMutation = useValuatePortfolio();
  const today = new Date().toISOString().split('T')[0];
  const { data: valuations = [] } = useInvestmentValuations(code ?? '', today);
  const { data: acctSummary } = useAccountingSummary(code ?? '', today);

  useEffect(() => {
    document.title = portfolio ? `${portfolio.name} — Portfolio | CBS` : 'Portfolio Detail | CBS';
  }, [portfolio]);

  if (isLoading || !portfolio) {
    return (
      <>
        <PageHeader title="Portfolio Detail" backTo="/investments" />
        <div className="page-container"><div className="h-64 rounded-xl bg-muted animate-pulse" /></div>
      </>
    );
  }

  const pnl = (portfolio.totalValue ?? 0) - (portfolio.costBasis ?? 0);
  const pnlPct = portfolio.costBasis ? (pnl / portfolio.costBasis) * 100 : 0;

  const handleValuate = () => {
    valuateMutation.mutate(code!, {
      onSuccess: (result) => toast.success(`Valuation complete: ${formatMoney(result.totalValue, portfolio.currency)}`),
      onError: () => toast.error('Valuation failed'),
    });
  };

  const tabs = [
    {
      id: 'holdings', label: 'Holdings', badge: holdings.length || undefined,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddHolding(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Add Holding
            </button>
          </div>
          <HoldingsTable holdings={holdings} isLoading={holdingsLoading} currency={portfolio.currency} />
        </div>
      ),
    },
    {
      id: 'allocation', label: 'Allocation',
      content: (
        <div className="p-4 space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Asset Allocation</h3>
            <AllocationChart holdings={holdings} currency={portfolio.currency} />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <ConcentrationAnalysis holdings={holdings} currency={portfolio.currency} />
          </div>
        </div>
      ),
    },
    {
      id: 'performance', label: 'Performance',
      content: (
        <div className="p-4 space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Returns Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'YTD Return', value: portfolio.returnYtd },
                { label: 'Since Inception', value: portfolio.returnTotal },
                { label: 'Unrealized P&L', value: pnlPct, isMoney: false },
              ].map((r) => (
                <div key={r.label} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className={cn('text-lg font-bold mt-1', (r.value ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {r.value != null ? `${r.value >= 0 ? '+' : ''}${r.value.toFixed(1)}%` : '—'}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                <p className={cn('text-lg font-bold mt-1', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatMoney(pnl, portfolio.currency)}
                </p>
              </div>
            </div>
          </div>
          {portfolio.benchmark && (
            <div className="rounded-lg border p-3 text-center text-sm text-muted-foreground">
              Benchmark: <span className="font-medium text-foreground">{portfolio.benchmark}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'valuation', label: 'Valuation',
      content: (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Last valuation: <span className="font-medium text-foreground">{portfolio.lastValuationDate ? formatDateTime(portfolio.lastValuationDate) : 'Never'}</span>
            </div>
            <button onClick={handleValuate} disabled={valuateMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {valuateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run Valuation
            </button>
          </div>
          {valuateMutation.data && (
            <div className="rounded-xl border bg-green-50 dark:bg-green-900/10 p-5 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Latest Valuation Result</p>
              <p className="text-2xl font-bold text-green-700">{formatMoney(valuateMutation.data.totalValue, portfolio.currency)}</p>
              <p className="text-xs text-muted-foreground">YTD Return: {formatPercent(valuateMutation.data.returnYtd)} · As of {formatDateTime(valuateMutation.data.valuatedAt)}</p>
            </div>
          )}
          {valuations.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Valuation History</h3>
              <div className="space-y-2">
                {valuations.map((v: any, i: number) => (
                  <div key={i} className="flex justify-between py-2 border-b last:border-0 text-sm">
                    <span className="text-muted-foreground">{v.valuationDate ?? v.date ?? '—'}</span>
                    <span className="font-mono">{formatMoney(v.marketValue ?? v.totalValue ?? 0, portfolio.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'accounting', label: 'Accounting',
      content: (
        <div className="p-4">
          {acctSummary ? (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold">IFRS9 Accounting Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(acctSummary).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="font-mono">{typeof v === 'number' ? formatMoney(v as number, portfolio.currency) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No accounting summary available for this date.</p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={portfolio.name}
        subtitle={`${portfolio.code} · ${portfolio.type} · ${portfolio.currency}`}
        backTo="/investments"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddHolding(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              <Plus className="w-4 h-4" /> Add Holding
            </button>
            <button onClick={handleValuate} disabled={valuateMutation.isPending} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              <Calculator className="w-4 h-4" /> Valuate
            </button>
            <StatusBadge status={portfolio.type} />
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Value" value={formatMoney(portfolio.totalValue ?? 0, portfolio.currency)} icon={DollarSign} />
          <StatCard label="Holdings" value={holdings.length} format="number" icon={Briefcase} />
          <StatCard label="YTD Return" value={portfolio.returnYtd != null ? `${portfolio.returnYtd >= 0 ? '+' : ''}${portfolio.returnYtd.toFixed(1)}%` : '—'} icon={TrendingUp} />
          <StatCard label="P&L" value={`${pnl >= 0 ? '+' : ''}${formatMoney(pnl, portfolio.currency)}`} icon={ArrowUpRight} />
          <StatCard label="Cost Basis" value={formatMoney(portfolio.costBasis ?? 0, portfolio.currency)} icon={BarChart3} />
          <StatCard label="Manager" value={portfolio.manager ?? '—'} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>

      <AddHoldingSheet portfolioCode={code!} currency={portfolio.currency} open={showAddHolding} onClose={() => setShowAddHolding(false)} />
    </>
  );
}
