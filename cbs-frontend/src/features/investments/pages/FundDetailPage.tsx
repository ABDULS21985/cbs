import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Loader2, Edit2, Star, X, Layers, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, EmptyState, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useFundsByAum, useUpdateNav } from '../../capitalmarkets/hooks/useCapitalMarkets';
import type { Fund, NavUpdateInput } from '../../capitalmarkets/api/capitalMarketsApi';

// ─── NAV Update Form ──────────────────────────────────────────────────────────

function NavUpdateForm({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const updateNav = useUpdateNav();
  const [form, setForm] = useState<NavUpdateInput>({
    navPerUnit: fund.navPerUnit,
    totalAum: fund.currentAum,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNav.mutate({ code: fund.code, input: form }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-1">Update NAV</h2>
        <p className="text-sm text-muted-foreground mb-4">{fund.name}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">NAV per Unit</label>
            <input type="number" className="w-full mt-1 input" value={form.navPerUnit} onChange={(e) => setForm((f) => ({ ...f, navPerUnit: parseFloat(e.target.value) || 0 }))} required step="0.0001" min={0} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Total AUM</label>
            <input type="number" className="w-full mt-1 input" value={form.totalAum} onChange={(e) => setForm((f) => ({ ...f, totalAum: parseFloat(e.target.value) || 0 }))} required min={0} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={updateNav.isPending} className="btn-primary">
              {updateNav.isPending ? 'Updating...' : 'Update NAV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FundDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  useEffect(() => { document.title = `Fund ${code} | CBS`; }, [code]);

  const [showNavUpdate, setShowNavUpdate] = useState(false);
  const { data: allFunds = [], isLoading } = useFundsByAum();
  const fund = allFunds.find((f) => f.code === code);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/investments/funds" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!fund) {
    return (
      <>
        <PageHeader title="Fund Not Found" backTo="/investments/funds" />
        <div className="page-container">
          <EmptyState title="Fund not found" description={`No fund found with code "${code}".`} />
        </div>
      </>
    );
  }

  const ytd = fund.ytdReturn ?? 0;
  const inceptionReturn = fund.inceptionReturn ?? 0;

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'NAV per Unit', value: fund.navPerUnit.toFixed(4), mono: true },
              { label: 'Total AUM', value: formatMoney(fund.currentAum, fund.currency), mono: true },
              { label: 'Unit Holders', value: (fund.unitHolders ?? 0).toLocaleString() },
              { label: 'Inception Date', value: formatDate(fund.inceptionDate) },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className={cn('text-lg font-bold mt-1', m.mono && 'font-mono')}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* AUM Progress */}
          <div className="rounded-lg border p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">AUM Target Progress</h3>
              <span className="text-xs text-muted-foreground">{formatMoney(fund.currentAum, fund.currency)} / {formatMoney(fund.targetAum, fund.currency)}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (fund.currentAum / Math.max(fund.targetAum, 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fund Details */}
          <div className="rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-3">Fund Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Fund Type</p><StatusBadge status={fund.type} /></div>
              <div><p className="text-xs text-muted-foreground">Currency</p><p className="font-medium">{fund.currency}</p></div>
              <div><p className="text-xs text-muted-foreground">Manager</p><p className="font-medium">{fund.manager ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Sharia</p><p className="font-medium">{fund.shariaCompliant ? 'Yes' : 'No'}</p></div>
              <div><p className="text-xs text-muted-foreground">Last NAV Date</p><p className="font-medium">{fund.lastNavDate ? formatDate(fund.lastNavDate) : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Inception NAV</p><p className="font-mono font-medium">{fund.inceptionNav?.toFixed(4) ?? '—'}</p></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'performance',
      label: 'Performance',
      content: (
        <div className="p-6 space-y-6">
          {/* Returns Table */}
          <div className="rounded-lg border p-5">
            <h3 className="text-sm font-semibold mb-4">Return Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'YTD Return', value: ytd },
                { label: 'Since Inception', value: inceptionReturn },
              ].map((item) => (
                <div key={item.label} className="text-center rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={cn('text-2xl font-bold font-mono mt-1', item.value >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {fund.benchmark && (
            <div className="rounded-lg border p-5">
              <h3 className="text-sm font-semibold mb-2">Benchmark</h3>
              <p className="text-sm text-muted-foreground">{fund.benchmark}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'nav-history',
      label: 'NAV History',
      content: (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">NAV Update</h3>
            <button onClick={() => setShowNavUpdate(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors">
              <Edit2 className="w-3 h-3" /> Update NAV
            </button>
          </div>
          <div className="rounded-lg border p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Current NAV</p>
                <p className="text-2xl font-bold font-mono mt-1">{fund.navPerUnit.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AUM</p>
                <p className="text-2xl font-bold font-mono mt-1">{formatMoney(fund.currentAum, fund.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-lg font-medium mt-1">{fund.lastNavDate ? formatDate(fund.lastNavDate) : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {showNavUpdate && <NavUpdateForm fund={fund} onClose={() => setShowNavUpdate(false)} />}

      <PageHeader
        title={fund.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono">{fund.code}</span>
            <StatusBadge status={fund.type} />
            {fund.shariaCompliant && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Star className="w-2.5 h-2.5" /> Sharia
              </span>
            )}
          </span>
        }
        backTo="/investments/funds"
        actions={
          <button onClick={() => setShowNavUpdate(true)} className="flex items-center gap-2 btn-primary">
            <Edit2 className="w-4 h-4" /> Update NAV
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="NAV per Unit" value={fund.navPerUnit.toFixed(4)} icon={BarChart3} />
          <StatCard label="Total AUM" value={fund.currentAum} format="money" currency={fund.currency} compact icon={Layers} />
          <StatCard label="YTD Return" value={ytd} format="percent" trend={ytd >= 0 ? 'up' : 'down'} icon={ytd >= 0 ? TrendingUp : TrendingDown} />
          <StatCard label="Unit Holders" value={fund.unitHolders ?? 0} format="number" />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
