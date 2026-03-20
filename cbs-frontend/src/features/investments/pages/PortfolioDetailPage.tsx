import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Plus, X, Loader2, RefreshCw,
  Briefcase, BarChart3, Target,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, EmptyState, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
  usePortfolioDetail,
  usePortfolioHoldings,
  useAddHolding,
  useValuatePortfolio,
} from '../../capitalmarkets/hooks/useCapitalMarkets';
import type {
  Holding,
  AddHoldingInput,
  HoldingType,
} from '../../capitalmarkets/api/capitalMarketsApi';

const PIE_COLORS: Record<string, string> = {
  EQUITY: '#6366f1',
  FIXED_INCOME: '#0ea5e9',
  CASH: '#22c55e',
  ALTERNATIVE: '#f59e0b',
  COMMODITY: '#ef4444',
};

// ─── Add Holding Form ─────────────────────────────────────────────────────────

function AddHoldingForm({ portfolioCode, onClose }: { portfolioCode: string; onClose: () => void }) {
  const addHolding = useAddHolding(portfolioCode);
  const [form, setForm] = useState<AddHoldingInput>({
    instrumentCode: '',
    instrumentName: '',
    holdingType: 'EQUITY',
    quantity: 0,
    costPrice: 0,
    currency: 'NGN',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addHolding.mutate(form, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Add Holding</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Instrument Code</label>
            <input className="w-full mt-1 input" placeholder="e.g. DANGCEM" value={form.instrumentCode} onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Instrument Name</label>
            <input className="w-full mt-1 input" placeholder="e.g. Dangote Cement Plc" value={form.instrumentName} onChange={(e) => setForm((f) => ({ ...f, instrumentName: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select value={form.holdingType} onChange={(e) => setForm((f) => ({ ...f, holdingType: e.target.value as HoldingType }))} className="w-full mt-1 input">
                <option value="EQUITY">Equity</option>
                <option value="FIXED_INCOME">Fixed Income</option>
                <option value="CASH">Cash</option>
                <option value="ALTERNATIVE">Alternative</option>
                <option value="COMMODITY">Commodity</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 input">
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <input type="number" className="w-full mt-1 input" value={form.quantity || ''} onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} required min={0} step="any" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
              <input type="number" className="w-full mt-1 input" value={form.costPrice || ''} onChange={(e) => setForm((f) => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))} required min={0} step="any" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={addHolding.isPending} className="btn-primary">
              {addHolding.isPending ? 'Adding...' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Holdings Tab ─────────────────────────────────────────────────────────────

const holdingCols: ColumnDef<Holding, unknown>[] = [
  {
    accessorKey: 'instrumentName',
    header: 'Instrument',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.instrumentName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.original.instrumentCode}</p>
      </div>
    ),
  },
  { accessorKey: 'holdingType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.holdingType} /> },
  { accessorKey: 'quantity', header: 'Quantity', cell: ({ row }) => <span className="font-mono text-sm">{row.original.quantity.toLocaleString()}</span> },
  { accessorKey: 'costPrice', header: 'Avg Cost', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.costPrice, row.original.currency)}</span> },
  { accessorKey: 'currentValue', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.currentValue != null ? formatMoney(row.original.currentValue, row.original.currency) : '—'}</span> },
  {
    accessorKey: 'unrealizedPnl',
    header: 'P&L',
    cell: ({ row }) => {
      const pnl = row.original.unrealizedPnl;
      if (pnl == null) return <span className="text-muted-foreground">—</span>;
      return (
        <span className={cn('font-mono text-sm font-medium', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
          {formatMoney(pnl, row.original.currency)}
          {row.original.unrealizedPnlPct != null && (
            <span className="text-xs ml-1">({row.original.unrealizedPnlPct >= 0 ? '+' : ''}{row.original.unrealizedPnlPct.toFixed(2)}%)</span>
          )}
        </span>
      );
    },
  },
  { accessorKey: 'weight', header: 'Weight', cell: ({ row }) => <span className="text-sm">{row.original.weight != null ? `${row.original.weight.toFixed(1)}%` : '—'}</span> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PortfolioDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  useEffect(() => { document.title = `Portfolio ${code} | CBS`; }, [code]);

  const [showAddHolding, setShowAddHolding] = useState(false);
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolioDetail(code);
  const { data: holdings = [], isLoading: holdingsLoading } = usePortfolioHoldings(code);
  const valuateMutation = useValuatePortfolio();

  const totalValue = portfolio?.totalValue ?? 0;
  const costBasis = portfolio?.costBasis ?? holdings.reduce((s, h) => s + h.quantity * h.costPrice, 0);
  const unrealizedPnl = holdings.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0);
  const returnYtd = portfolio?.returnYtd ?? 0;

  // Allocation data for pie chart
  const allocationData = useMemo(() => {
    const byType: Record<string, number> = {};
    holdings.forEach((h) => {
      const val = h.currentValue ?? h.quantity * h.costPrice;
      byType[h.holdingType] = (byType[h.holdingType] ?? 0) + val;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [holdings]);

  const handleValuate = () => valuateMutation.mutate(code);

  const tabs = [
    {
      id: 'holdings',
      label: 'Holdings',
      badge: holdings.length || undefined,
      content: (
        <div className="p-4 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <DataTable columns={holdingCols} data={holdings} isLoading={holdingsLoading} enableGlobalFilter emptyMessage="No holdings yet" />
            </div>
            {allocationData.length > 0 && (
              <div className="w-full lg:w-64">
                <p className="text-sm font-semibold mb-2">Asset Allocation</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {allocationData.map((e) => <Cell key={e.name} fill={PIE_COLORS[e.name] ?? '#94a3b8'} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v, portfolio?.currency)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'performance',
      label: 'Performance',
      content: (
        <div className="p-6 space-y-6">
          {/* Returns table */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Return Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'YTD', value: returnYtd },
                { label: 'Total Return', value: portfolio?.returnTotal ?? 0 },
                { label: 'Unrealized P&L', money: true, value: unrealizedPnl },
                { label: 'Cost Basis', money: true, value: costBasis },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={cn('text-lg font-bold font-mono mt-1',
                    item.money ? (item.value >= 0 ? 'text-green-600' : 'text-red-600') : '',
                    !item.money ? (item.value >= 0 ? 'text-green-600' : 'text-red-600') : '',
                  )}>
                    {item.money ? formatMoney(item.value, portfolio?.currency) : `${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}%`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {portfolio?.benchmark && (
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2">Benchmark</h3>
              <p className="text-sm text-muted-foreground">{portfolio.benchmark}</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'valuation',
      label: 'Valuation',
      content: (
        <div className="p-6 space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Portfolio Valuation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last valued: {portfolio?.lastValuationDate ? formatDate(portfolio.lastValuationDate) : 'Never'}
                </p>
              </div>
              <button
                onClick={handleValuate}
                disabled={valuateMutation.isPending}
                className="flex items-center gap-2 btn-primary"
              >
                {valuateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {valuateMutation.isPending ? 'Valuating...' : 'Run Valuation'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold font-mono mt-1">{formatMoney(totalValue, portfolio?.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost Basis</p>
                <p className="text-xl font-bold font-mono mt-1">{formatMoney(costBasis, portfolio?.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                <p className={cn('text-xl font-bold font-mono mt-1', unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatMoney(unrealizedPnl, portfolio?.currency)}
                </p>
              </div>
            </div>
          </div>

          {valuateMutation.data && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40 p-5">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">Valuation Complete</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">New Total Value</p>
                  <p className="font-mono font-bold">{formatMoney(valuateMutation.data.totalValue, portfolio?.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Return YTD</p>
                  <p className="font-mono font-bold">{valuateMutation.data.returnYtd.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valuated At</p>
                  <p className="font-mono">{formatDate(valuateMutation.data.valuatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  if (portfolioLoading) {
    return (
      <>
        <PageHeader title="Loading..." subtitle="Portfolio detail" backTo="/investments" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!portfolio) {
    return (
      <>
        <PageHeader title="Portfolio Not Found" backTo="/investments" />
        <div className="page-container">
          <EmptyState title="Portfolio not found" description={`No portfolio found with code "${code}".`} />
        </div>
      </>
    );
  }

  return (
    <>
      {showAddHolding && <AddHoldingForm portfolioCode={code} onClose={() => setShowAddHolding(false)} />}

      <PageHeader
        title={portfolio.name}
        subtitle={`${portfolio.code} · ${portfolio.customerName ?? `Customer #${portfolio.customerId}`}`}
        backTo="/investments"
        actions={
          <button onClick={() => setShowAddHolding(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> Add Holding
          </button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Value" value={totalValue} format="money" currency={portfolio.currency} compact icon={Briefcase} />
          <StatCard label="Holdings" value={holdings.length} format="number" icon={BarChart3} />
          <StatCard
            label="Return YTD"
            value={returnYtd}
            format="percent"
            trend={returnYtd >= 0 ? 'up' : 'down'}
            icon={returnYtd >= 0 ? TrendingUp : TrendingDown}
          />
          <StatCard label="Type" value={portfolio.type.replace('_', ' ')} icon={Target} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
