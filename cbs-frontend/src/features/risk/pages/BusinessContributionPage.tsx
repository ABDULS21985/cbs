import { useState } from 'react';
import {
  Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Building2,
  Package, Globe, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useBusinessContributionTop,
  useBusinessContributionUnderperformers,
  useBusinessContributionByBU,
  useBusinessContributionByProduct,
  useBusinessContributionByRegion,
} from '../hooks/useRiskExt';
import type { BusinessContribution } from '../types/businessContribution';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(2)}%`;
}

function fmtRatio(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
}

type ViewDimension = 'top' | 'underperformers' | 'bu' | 'product' | 'region';

// ─── Contribution Table ──────────────────────────────────────────────────────

function ContributionTable({ items, loading }: { items: BusinessContribution[]; loading: boolean }) {
  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No contribution data found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Business Unit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product / Region</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Revenue</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Cost</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Net Profit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">C/I Ratio</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">ROE</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">RWA</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">RAROC</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Profit %</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => {
              const isProfit = (c.netProfit || 0) > 0;
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{c.businessUnitName || c.businessUnit || '—'}</p>
                    <p className="text-xs text-muted-foreground">{c.periodType} · {c.periodDate}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.productFamily || '—'} / {c.region || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtMoney(c.totalRevenue)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmtMoney(c.totalCost)}</td>
                  <td className={cn('px-4 py-3 text-right font-mono tabular-nums font-semibold', isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {isProfit && '+'}{fmtMoney(c.netProfit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">{fmtRatio(c.costToIncomeRatio)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">{fmtRatio(c.returnOnEquity)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">{fmtMoney(c.rwaAmount)}</td>
                  <td className={cn('px-4 py-3 text-right font-mono tabular-nums text-xs font-semibold',
                    (c.returnOnRwa || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {fmtRatio(c.returnOnRwa)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isProfit ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                      <span className="font-mono tabular-nums text-xs font-semibold">{fmtRatio(c.profitContributionPct)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function BusinessContributionPage() {
  const [view, setView] = useState<ViewDimension>('top');
  const [buFilter, setBuFilter] = useState('RETAIL');
  const [productFilter, setProductFilter] = useState('LOANS');
  const [regionFilter, setRegionFilter] = useState('WEST_AFRICA');
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [limit, setLimit] = useState(10);

  const topQuery = useBusinessContributionTop(view === 'top' ? periodType : '', view === 'top' ? limit : 0);
  const underQuery = useBusinessContributionUnderperformers(view === 'underperformers' ? periodType : '');
  const buQuery = useBusinessContributionByBU(view === 'bu' ? buFilter : '');
  const productQuery = useBusinessContributionByProduct(view === 'product' ? productFilter : '');
  const regionQuery = useBusinessContributionByRegion(view === 'region' ? regionFilter : '');

  const queryMap: Record<ViewDimension, { data: BusinessContribution[] | undefined; isLoading: boolean }> = {
    top: topQuery,
    underperformers: underQuery,
    bu: buQuery,
    product: productQuery,
    region: regionQuery,
  };

  const { data: items = [], isLoading } = queryMap[view];

  // Summary stats from top contributors
  const totalRevenue = items.reduce((s, c) => s + (c.totalRevenue || 0), 0);
  const totalProfit = items.reduce((s, c) => s + (c.netProfit || 0), 0);
  const totalRwa = items.reduce((s, c) => s + (c.rwaAmount || 0), 0);

  const VIEWS: Array<{ id: ViewDimension; label: string; icon: typeof Building2 }> = [
    { id: 'top', label: 'Top Contributors', icon: TrendingUp },
    { id: 'underperformers', label: 'Underperformers', icon: TrendingDown },
    { id: 'bu', label: 'By Business Unit', icon: Building2 },
    { id: 'product', label: 'By Product', icon: Package },
    { id: 'region', label: 'By Region', icon: Globe },
  ];

  return (
    <>
      <PageHeader
        title="Business Contribution & RAROC"
        subtitle="Revenue, cost, profitability, and risk-adjusted return analysis by business unit, product, and region"
      />

      <div className="px-6 space-y-6 pb-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtMoney(totalRevenue)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center',
                totalProfit >= 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400')}>
                {totalProfit >= 0 ? <TrendingUp className="w-4.5 h-4.5" /> : <TrendingDown className="w-4.5 h-4.5" />}
              </div>
              <p className="text-xs text-muted-foreground">Net Profit</p>
            </div>
            <p className={cn('text-2xl font-bold tabular-nums', totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {fmtMoney(totalProfit)}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <p className="text-xs text-muted-foreground">Total RWA</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtMoney(totalRwa)}</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 border-b pb-0">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setView(id)}
                className={cn('flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
                  view === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border')}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {(view === 'top' || view === 'underperformers') && (
              <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}
                className="rounded-lg border bg-background px-3 py-1.5 text-xs">
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMI_ANNUAL">Semi-Annual</option>
                <option value="ANNUAL">Annual</option>
              </select>
            )}
            {view === 'bu' && (
              <input value={buFilter} onChange={(e) => setBuFilter(e.target.value)}
                placeholder="Business unit code" className="rounded-lg border bg-background px-3 py-1.5 text-xs w-36" />
            )}
            {view === 'product' && (
              <input value={productFilter} onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Product family" className="rounded-lg border bg-background px-3 py-1.5 text-xs w-36" />
            )}
            {view === 'region' && (
              <input value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
                placeholder="Region" className="rounded-lg border bg-background px-3 py-1.5 text-xs w-36" />
            )}
          </div>
        </div>

        {/* Data Table */}
        <ContributionTable items={items} loading={isLoading} />
      </div>
    </>
  );
}
