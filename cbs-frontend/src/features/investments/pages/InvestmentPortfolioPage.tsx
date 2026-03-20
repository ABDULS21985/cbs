import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, LayoutGrid, Table2, Briefcase, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { usePortfolios, useInvestmentPortfolios, useCreatePortfolio } from '../hooks/useInvestments';
import { PortfolioCard } from '../components/portfolio/PortfolioCard';

// ── Create Portfolio Sheet ──────────────────────────────────────────────────

function CreatePortfolioForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPortfolio = useCreatePortfolio();
  const [form, setForm] = useState({ customerId: 0, type: 'DISCRETIONARY', name: '', currency: 'NGN', benchmark: '', manager: '' });

  if (!open) return null;

  const handleSubmit = () => {
    createPortfolio.mutate(form, {
      onSuccess: () => { toast.success('Portfolio created'); onClose(); },
      onError: () => toast.error('Failed to create portfolio'),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold">Create Investment Portfolio</h3>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground">Customer ID</label><input type="number" value={form.customerId || ''} onChange={(e) => setForm((f) => ({ ...f, customerId: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Portfolio Name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Growth Portfolio" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Type</label><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                {['DISCRETIONARY', 'ADVISORY', 'EXECUTION_ONLY'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select></div>
              <div><label className="text-xs font-medium text-muted-foreground">Currency</label><select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Benchmark</label><input value={form.benchmark} onChange={(e) => setForm((f) => ({ ...f, benchmark: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="NSE ASI" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Manager</label><input value={form.manager} onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={createPortfolio.isPending || !form.name || !form.customerId}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function InvestmentPortfolioPage() {
  useEffect(() => { document.title = 'Investment Portfolios | CBS'; }, []);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const { data: portfolios = [], isLoading } = usePortfolios();
  const { data: accountingPortfolios = [] } = useInvestmentPortfolios();

  const totalAum = portfolios.reduce((s: number, p: any) => s + (p.totalValue ?? 0), 0);
  const avgYtd = portfolios.length > 0 ? portfolios.reduce((s: number, p: any) => s + (p.returnYtd ?? 0), 0) / portfolios.length : 0;

  const portfolioCols: ColumnDef<any, unknown>[] = [
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => <code className="text-xs font-mono">{row.original.code}</code> },
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => <span className="text-sm font-medium">{row.original.customerName ?? row.original.name}</span> },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.type} size="sm" /> },
    { accessorKey: 'totalValue', header: 'AUM', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalValue ?? 0, row.original.currency)}</span> },
    { accessorKey: 'costBasis', header: 'Cost', cell: ({ row }) => <span className="font-mono text-xs">{row.original.costBasis ? formatMoney(row.original.costBasis, row.original.currency) : '—'}</span> },
    { id: 'pnl', header: 'P&L', cell: ({ row }) => {
      const pnl = (row.original.totalValue ?? 0) - (row.original.costBasis ?? 0);
      return <span className={cn('font-mono text-xs font-medium', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>{pnl >= 0 ? '+' : ''}{formatMoney(pnl, row.original.currency)}</span>;
    }},
    { accessorKey: 'returnYtd', header: 'YTD', cell: ({ row }) => row.original.returnYtd != null ? <span className={cn('text-xs font-medium', row.original.returnYtd >= 0 ? 'text-green-600' : 'text-red-600')}>{row.original.returnYtd >= 0 ? '+' : ''}{formatPercent(row.original.returnYtd)}</span> : '—' },
    { accessorKey: 'benchmark', header: 'Benchmark' },
    { accessorKey: 'manager', header: 'Manager' },
  ];

  const acctCols: ColumnDef<any, unknown>[] = [
    { accessorKey: 'portfolioCode', header: 'Code', cell: ({ row }) => <code className="text-xs font-mono">{row.original.portfolioCode}</code> },
    { accessorKey: 'portfolioName', header: 'Name' },
    { accessorKey: 'ifrs9Classification', header: 'IFRS9 Class' },
    { accessorKey: 'businessModel', header: 'Business Model' },
    { accessorKey: 'maxPortfolioSize', header: 'Max Size', cell: ({ row }) => formatMoney(row.original.maxPortfolioSize ?? 0, row.original.currencyCode) },
    { accessorKey: 'currencyCode', header: 'CCY' },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
  ];

  const tabs = [
    {
      id: 'portfolios', label: 'All Portfolios',
      content: (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg border overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={cn('px-3 py-1.5 text-xs font-medium', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('table')} className={cn('px-3 py-1.5 text-xs font-medium', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                <Table2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : viewMode === 'grid' ? (
            portfolios.length === 0 ? (
              <div className="rounded-xl border border-dashed p-16 text-center">
                <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No portfolios yet</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  <Plus className="w-4 h-4 inline mr-1" /> Create Portfolio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolios.map((p: any) => <PortfolioCard key={p.id} portfolio={p} />)}
              </div>
            )
          ) : (
            <DataTable columns={portfolioCols} data={portfolios} isLoading={isLoading} enableGlobalFilter
              onRowClick={(row: any) => navigate(`/investments/portfolios/${row.code}`)} emptyMessage="No portfolios" />
          )}
        </div>
      ),
    },
    {
      id: 'accounting', label: 'Accounting View',
      content: (
        <div className="p-4">
          <DataTable columns={acctCols} data={accountingPortfolios} enableGlobalFilter emptyMessage="No accounting portfolios" />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Investment Portfolios" subtitle="Manage customer investment portfolios and fund allocations"
        actions={<button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Create Portfolio</button>} />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total AUM" value={formatMoney(totalAum)} icon={DollarSign} />
          <StatCard label="Portfolios" value={portfolios.length} format="number" icon={Briefcase} />
          <StatCard label="Avg YTD Return" value={avgYtd ? `${avgYtd.toFixed(1)}%` : '—'} icon={TrendingUp} />
          <StatCard label="Accounting Portfolios" value={accountingPortfolios.length} format="number" icon={AlertCircle} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>

      <CreatePortfolioForm open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
