import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Layers, DollarSign, TrendingUp, Clock, Shield } from 'lucide-react';
import { bankPortfolioApi } from '../api/fixedIncomeApi';
import type { BankPortfolio } from '../types/bankPortfolio';

const PORTFOLIO_TYPES = ['', 'TRADING', 'BANKING', 'HTM', 'AFS', 'FVTPL'];
const TYPE_LABELS: Record<string, string> = { TRADING: 'Trading', BANKING: 'Banking Book', HTM: 'Hold to Maturity', AFS: 'Available for Sale', FVTPL: 'Fair Value' };
const TYPE_COLORS: Record<string, string> = {
  TRADING: 'bg-blue-100 text-blue-800', BANKING: 'bg-green-100 text-green-800', HTM: 'bg-purple-100 text-purple-800', AFS: 'bg-amber-100 text-amber-800', FVTPL: 'bg-cyan-100 text-cyan-800',
};

export function BankPortfolioPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ portfolioCode: '', portfolioName: '', portfolioType: 'TRADING', currency: 'NGN', benchmark: '' });

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ['bank-portfolios'],
    queryFn: () => bankPortfolioApi.getAll(),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => typeFilter ? portfolios.filter((p) => p.portfolioType === typeFilter) : portfolios, [portfolios, typeFilter]);

  const createMut = useMutation({
    mutationFn: (data: Partial<BankPortfolio>) => bankPortfolioApi.create(data),
    onSuccess: () => { toast.success('Portfolio created'); qc.invalidateQueries({ queryKey: ['bank-portfolios'] }); setShowCreate(false); },
    onError: () => toast.error('Failed to create portfolio'),
  });

  const stats = useMemo(() => ({
    count: portfolios.length,
    totalValue: portfolios.reduce((s, p) => s + p.totalValue, 0),
    avgYtm: portfolios.length > 0 ? portfolios.reduce((s, p) => s + p.yieldToMaturity, 0) / portfolios.length : 0,
    avgDuration: portfolios.length > 0 ? portfolios.reduce((s, p) => s + p.modifiedDuration, 0) / portfolios.length : 0,
    totalVar: portfolios.reduce((s, p) => s + p.var991d, 0),
  }), [portfolios]);

  const columns: ColumnDef<BankPortfolio, unknown>[] = [
    { accessorKey: 'portfolioCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.portfolioCode}</span> },
    { accessorKey: 'portfolioName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.portfolioName}</span> },
    {
      accessorKey: 'portfolioType', header: 'Type',
      cell: ({ row }) => <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium', TYPE_COLORS[row.original.portfolioType] ?? 'bg-gray-100 text-gray-800')}>{TYPE_LABELS[row.original.portfolioType] ?? row.original.portfolioType}</span>,
    },
    { accessorKey: 'currency', header: 'CCY', cell: ({ row }) => <span className="text-xs">{row.original.currency}</span> },
    { accessorKey: 'totalValue', header: 'Value', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.totalValue, row.original.currency)}</span> },
    {
      accessorKey: 'unrealizedPnl', header: 'Unrealized P&L',
      cell: ({ row }) => <span className={cn('font-mono text-sm tabular-nums font-medium', row.original.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>{row.original.unrealizedPnl >= 0 ? '+' : ''}{formatMoney(row.original.unrealizedPnl, row.original.currency)}</span>,
    },
    { accessorKey: 'yieldToMaturity', header: 'YTM', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.yieldToMaturity)}</span> },
    { accessorKey: 'modifiedDuration', header: 'Duration', cell: ({ row }) => <span className="font-mono text-sm">{row.original.modifiedDuration.toFixed(2)}Y</span> },
    { accessorKey: 'convexity', header: 'Convexity', cell: ({ row }) => <span className="font-mono text-xs">{row.original.convexity.toFixed(2)}</span> },
    { accessorKey: 'var991d', header: 'VaR(99%,1d)', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{formatMoney(row.original.var991d, row.original.currency)}</span> },
    { accessorKey: 'assetCount', header: 'Assets', cell: ({ row }) => <span className="text-sm">{row.original.assetCount}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
  ];

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader title="Bank Investment Portfolios" subtitle="Proprietary trading and banking book management"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Portfolio</button>} />

      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Portfolios" value={stats.count} format="number" icon={Layers} loading={isLoading} />
          <StatCard label="Total Value" value={stats.totalValue} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Avg YTM" value={stats.avgYtm} format="percent" icon={TrendingUp} loading={isLoading} />
          <StatCard label="Avg Duration" value={`${stats.avgDuration.toFixed(2)}Y`} icon={Clock} loading={isLoading} />
          <StatCard label="Total VaR(99%)" value={stats.totalVar} format="money" compact icon={Shield} loading={isLoading} />
        </div>

        <div className="flex items-center gap-2">
          {PORTFOLIO_TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {t || 'All'} {t ? TYPE_LABELS[t] : ''}
            </button>
          ))}
        </div>

        <DataTable columns={columns} data={filtered} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="bank-portfolios" emptyMessage="No bank portfolios" />
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Create Portfolio</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Code</label><input value={form.portfolioCode} onChange={(e) => setForm({ ...form, portfolioCode: e.target.value.toUpperCase() })} className={cn(inputCls, 'font-mono')} placeholder="TRAD-001" /></div>
                <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.portfolioType} onChange={(e) => setForm({ ...form, portfolioType: e.target.value })} className={inputCls}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Name</label><input value={form.portfolioName} onChange={(e) => setForm({ ...form, portfolioName: e.target.value })} className={inputCls} placeholder="Trading Book Alpha" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}><option value="NGN">NGN</option><option value="USD">USD</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Benchmark</label><input value={form.benchmark} onChange={(e) => setForm({ ...form, benchmark: e.target.value })} className={inputCls} placeholder="FGN 5Y Index" /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => createMut.mutate(form as Partial<BankPortfolio>)} disabled={!form.portfolioCode || createMut.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {createMut.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
