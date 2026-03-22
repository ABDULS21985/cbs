import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, EmptyState, ConfirmDialog, SummaryBar } from '@/components/shared';
import { Plus, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useTreasuryDeals,
  useConfirmDeal,
  useSettleDeal,
  useBookDeal,
  useDealerDesks,
} from '../hooks/useTreasury';
import type { ColumnDef } from '@tanstack/react-table';
import type { TreasuryDeal, DealStatus, DealType, BookDealRequest } from '../api/tradingApi';

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterStatus = DealStatus | 'ALL';
type FilterType = DealType | 'ALL';

interface PendingAction {
  type: 'confirm' | 'settle';
  deal: TreasuryDeal;
}

// ─── Book Deal Dialog ──────────────────────────────────────────────────────────

interface BookDealDialogProps {
  open: boolean;
  onClose: () => void;
}

// Settlement date offsets by deal type
const SETTLEMENT_OFFSETS: Partial<Record<DealType, number>> = { FX: 2, MM: 1, BOND: 3, REPO: 1, TB: 1, FX_SPOT: 2, FX_FORWARD: 2, FX_SWAP: 2, MONEY_MARKET_PLACEMENT: 1, MONEY_MARKET_BORROWING: 1, BOND_PURCHASE: 3, BOND_SALE: 3, REVERSE_REPO: 1, TBILL_PURCHASE: 1, TBILL_DISCOUNT: 1 };

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) added++;
  }
  return result;
}

function BookDealDialog({ open, onClose }: BookDealDialogProps) {
  const { data: desks = [] } = useDealerDesks();
  const { data: existingDeals = [] } = useTreasuryDeals();
  const bookDeal = useBookDeal();
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState<BookDealRequest>({
    type: 'FX', counterparty: '', currency: 'NGN', amount: 0, rate: 0,
    maturityDate: '', valueDate: new Date().toISOString().slice(0, 10), deskId: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookDealRequest, string>>>({});

  if (!open) return null;

  const settlementDate = form.valueDate
    ? addBusinessDays(new Date(form.valueDate), SETTLEMENT_OFFSETS[form.type] ?? 2).toISOString().slice(0, 10) : '';
  const settlementAmount = form.amount * (1 + form.rate / 100);
  const accruedInterest = form.maturityDate && form.valueDate
    ? form.amount * form.rate / 100 * Math.max(0,
        (new Date(form.maturityDate).getTime() - new Date(form.valueDate).getTime()) / (365.25 * 86400000)) : 0;

  const duplicateWarning = existingDeals.some((d) =>
    d.type === form.type && d.counterparty === form.counterparty && d.currency === form.currency
    && Math.abs(d.amount - form.amount) < 0.01 && d.bookedAt > new Date(Date.now() - 3600000).toISOString());

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.counterparty.trim()) e.counterparty = 'Counterparty is required';
    if (!form.amount || form.amount <= 0) e.amount = 'Amount must be positive';
    if (!form.rate || form.rate <= 0) e.rate = 'Rate must be positive';
    if (form.rate > 100) e.rate = 'Rate seems too high — check value';
    if (!form.maturityDate) e.maturityDate = 'Maturity date is required';
    if (form.valueDate && form.maturityDate && form.maturityDate <= form.valueDate)
      e.maturityDate = 'Maturity must be after value date';
    if (!form.deskId) e.deskId = 'Desk is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!showPreview) { setShowPreview(true); return; }
    try {
      await bookDeal.mutateAsync(form);
      toast.success('Deal booked successfully');
      onClose();
      setForm({ type: 'FX', counterparty: '', currency: 'NGN', amount: 0, rate: 0, maturityDate: '', valueDate: new Date().toISOString().slice(0, 10), deskId: '' });
      setShowPreview(false);
    } catch { toast.error('Failed to book deal'); }
  };

  const field = (label: string, key: keyof BookDealRequest, content: React.ReactNode) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {content}
      {errors[key] && <p className="text-xs text-red-600 mt-0.5">{errors[key]}</p>}
    </div>
  );
  const fCls = (key: keyof BookDealRequest) => cn(
    'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40',
    errors[key] ? 'border-red-400' : 'border-border');

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-5">Book New Deal</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {field('Deal Type', 'type',
                <select className={fCls('type')} value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DealType }))}>
                  {(['FX', 'REPO', 'BOND', 'MM', 'TB'] as DealType[]).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>)}
              {field('Currency', 'currency',
                <select className={fCls('currency')} value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                  {['NGN', 'USD', 'EUR', 'GBP', 'XOF', 'ZAR'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>)}
            </div>
            {field('Counterparty', 'counterparty',
              <input className={fCls('counterparty')} placeholder="Search counterparty..."
                value={form.counterparty} onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))} />)}
            <div className="grid grid-cols-2 gap-4">
              {field('Amount', 'amount',
                <input type="number" min="0" step="0.01" className={fCls('amount')} placeholder="0.00"
                  value={form.amount || ''} onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />)}
              {field('Rate (%)', 'rate',
                <input type="number" min="0" step="0.001" className={fCls('rate')} placeholder="0.000"
                  value={form.rate || ''} onChange={(e) => setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {field('Value Date', 'valueDate' as keyof BookDealRequest,
                <input type="date" className={fCls('valueDate' as keyof BookDealRequest)}
                  value={form.valueDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, valueDate: e.target.value }))} />)}
              {field('Maturity Date', 'maturityDate',
                <input type="date" className={fCls('maturityDate')} value={form.maturityDate}
                  onChange={(e) => setForm((f) => ({ ...f, maturityDate: e.target.value }))} />)}
            </div>
            {settlementDate && (
              <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                Settlement Date (T+{SETTLEMENT_OFFSETS[form.type]}): <span className="font-medium">{formatDate(settlementDate)}</span>
              </div>
            )}
            {field('Dealer Desk', 'deskId',
              <select className={fCls('deskId')} value={form.deskId}
                onChange={(e) => setForm((f) => ({ ...f, deskId: e.target.value }))}>
                <option value="">Select desk…</option>
                {desks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>)}
            {duplicateWarning && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">A similar deal was booked in the last hour. Verify this is not a duplicate.</p>
              </div>
            )}
            {showPreview && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deal Preview</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Settlement Amount:</span><span className="font-mono font-medium">{formatMoney(settlementAmount, form.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Accrued Interest:</span><span className="font-mono font-medium">{formatMoney(accruedInterest, form.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">All-in Cost:</span><span className="font-mono font-medium">{formatMoney(form.amount + accruedInterest, form.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Settlement:</span><span className="font-medium">{settlementDate ? formatDate(settlementDate) : '—'}</span></div>
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { if (showPreview) setShowPreview(false); else onClose(); }}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                {showPreview ? 'Back' : 'Cancel'}
              </button>
              <button type="submit" disabled={bookDeal.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {bookDeal.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {showPreview ? 'Confirm & Book' : 'Preview Deal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function TreasuryDealsPage() {
  useEffect(() => { document.title = 'Treasury Deals | CBS'; }, []);

  // Keyboard shortcuts: Ctrl+N → open book dialog, Escape → close dialogs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setBookDialogOpen(true);
      }
      if (e.key === 'Escape') {
        setBookDialogOpen(false);
        setPendingAction(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [deskFilter, setDeskFilter] = useState('ALL');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const { data: desks = [] } = useDealerDesks();
  const { data: deals = [], isLoading, isError, refetch } = useTreasuryDeals(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
  );
  const confirmDeal = useConfirmDeal();
  const settleDeal = useSettleDeal();

  const currencies = useMemo(() => [...new Set(deals.map((d) => d.currency))].sort(), [deals]);

  const filtered = deals.filter((d) => {
    if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
    if (deskFilter !== 'ALL' && d.deskId !== deskFilter) return false;
    if (currencyFilter !== 'ALL' && d.currency !== currencyFilter) return false;
    if (amountMin && d.amount < parseFloat(amountMin)) return false;
    if (amountMax && d.amount > parseFloat(amountMax)) return false;
    if (dateFrom && d.bookedAt < dateFrom) return false;
    if (dateTo && d.bookedAt > dateTo + 'T23:59:59') return false;
    return true;
  });

  const summaryItems = useMemo(() => [
    { label: 'Total Deals', value: filtered.length, format: 'number' as const },
    { label: 'Total Notional', value: filtered.reduce((s, d) => s + d.amount, 0), format: 'money' as const, currency: 'NGN' },
    { label: 'Pending Confirmation', value: filtered.filter((d) => d.status === 'BOOKED').length, format: 'number' as const, color: 'warning' as const },
    { label: 'Pending Settlement', value: filtered.filter((d) => d.status === 'CONFIRMED').length, format: 'number' as const },
  ], [filtered]);

  const hasActiveFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL' || deskFilter !== 'ALL'
    || currencyFilter !== 'ALL' || amountMin || amountMax || dateFrom || dateTo;

  const clearAllFilters = () => {
    setStatusFilter('ALL'); setTypeFilter('ALL'); setDeskFilter('ALL');
    setCurrencyFilter('ALL'); setAmountMin(''); setAmountMax('');
    setDateFrom(''); setDateTo('');
  };

  const handleAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.type === 'confirm') {
        await confirmDeal.mutateAsync(pendingAction.deal.id);
        toast.success(`Deal ${pendingAction.deal.dealRef} confirmed`);
      } else {
        await settleDeal.mutateAsync(pendingAction.deal.id);
        toast.success(`Deal ${pendingAction.deal.dealRef} settled`);
      }
    } catch {
      toast.error(`Failed to ${pendingAction.type} deal`);
    }
    setPendingAction(null);
  };

  const isMutating = confirmDeal.isPending || settleDeal.isPending;

  const columns: ColumnDef<TreasuryDeal, any>[] = [
    {
      accessorKey: 'dealRef',
      header: 'Deal Ref',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/treasury/deals/${row.original.id}`); }}
          className="font-mono text-xs font-medium text-primary hover:underline"
        >
          {row.original.dealRef}
        </button>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    { accessorKey: 'counterparty', header: 'Counterparty' },
    { accessorKey: 'currency', header: 'Ccy' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amt = row.original.amount;
        return (
          <span className={cn(
            'font-mono text-sm text-right block',
            amt > 0 ? 'text-green-600 dark:text-green-400' : amt < 0 ? 'text-red-600 dark:text-red-400' : '',
          )}>
            {formatMoney(amt, row.original.currency)}
          </span>
        );
      },
    },
    {
      accessorKey: 'rate',
      header: 'Rate',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatPercent(row.original.rate)}</span>
      ),
    },
    {
      accessorKey: 'maturityDate',
      header: 'Maturity',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.maturityDate)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const deal = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {deal.status === 'BOOKED' && (
              <button
                onClick={() => setPendingAction({ type: 'confirm', deal })}
                className="px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
              >
                Confirm
              </button>
            )}
            {deal.status === 'CONFIRMED' && (
              <button
                onClick={() => setPendingAction({ type: 'settle', deal })}
                className="px-2.5 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition-colors"
              >
                Settle
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const selectCls =
    'border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40';
  const inputCls =
    'border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <PageHeader
        title="Treasury Deals"
        subtitle="Manage FX, repo, bond, money market and treasury bill deals"
        actions={
          <button
            onClick={() => setBookDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book Deal
          </button>
        }
      />

      <div className="page-container space-y-5">
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load deals.</span>
            <button onClick={() => refetch()} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
          </div>
        )}
        {/* Summary Bar */}
        <SummaryBar items={summaryItems} />

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 border rounded-lg">
          <div>
            <label className="text-xs font-medium text-muted-foreground mr-2">Status</label>
            <select className={selectCls} value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}>
              {(['ALL', 'BOOKED', 'CONFIRMED', 'SETTLED', 'MATURED', 'CANCELLED', 'DEFAULTED'] as FilterStatus[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mr-2">Type</label>
            <select className={selectCls} value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}>
              {(['ALL', 'FX', 'REPO', 'BOND', 'MM', 'TB'] as FilterType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mr-2">Desk</label>
            <select className={selectCls} value={deskFilter}
              onChange={(e) => setDeskFilter(e.target.value)}>
              <option value="ALL">All Desks</option>
              {desks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mr-2">Ccy</label>
            <select className={selectCls} value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}>
              <option value="ALL">All</option>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input type="date" className={inputCls} value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input type="date" className={inputCls} value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-muted-foreground">Amt</label>
            <input type="number" placeholder="Min" className={cn(inputCls, 'w-24')} value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)} />
            <span className="text-muted-foreground">–</span>
            <input type="number" placeholder="Max" className={cn(inputCls, 'w-24')} value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)} />
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Deals Table */}
        <div className="card">
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            enableGlobalFilter
            enableExport
            exportFilename="treasury-deals"
            onRowClick={(row) => navigate(`/treasury/deals/${row.id}`)}
          />
          {!isLoading && filtered.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No deals match your filters"
              description="Try adjusting status, type, or date filters."
              action={
                hasActiveFilters
                  ? { label: 'Clear Filters', onClick: clearAllFilters }
                  : { label: 'Book Deal', onClick: () => setBookDialogOpen(true), icon: Plus }
              }
            />
          )}
        </div>
      </div>

      {/* Book Deal Dialog */}
      <BookDealDialog open={bookDialogOpen} onClose={() => setBookDialogOpen(false)} />

      {/* Confirm / Settle Dialog */}
      <ConfirmDialog
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleAction}
        isLoading={isMutating}
        title={
          pendingAction?.type === 'confirm' ? 'Confirm Deal' : 'Settle Deal'
        }
        description={
          pendingAction
            ? pendingAction.type === 'confirm'
              ? `You are about to confirm deal ${pendingAction.deal.dealRef} with ${pendingAction.deal.counterparty} for ${formatMoney(pendingAction.deal.amount, pendingAction.deal.currency)}. This action cannot be undone.`
              : `You are about to settle deal ${pendingAction.deal.dealRef}. Ensure all settlement instructions have been sent before proceeding.`
            : ''
        }
        confirmLabel={pendingAction?.type === 'confirm' ? 'Confirm Deal' : 'Settle Deal'}
        variant="default"
      />
    </>
  );
}
