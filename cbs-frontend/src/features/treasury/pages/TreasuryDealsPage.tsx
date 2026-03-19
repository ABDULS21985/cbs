import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, EmptyState, ConfirmDialog } from '@/components/shared';
import { Plus, Loader2, FileText } from 'lucide-react';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useTreasuryDeals,
  useConfirmDeal,
  useSettleDeal,
  useBookDeal,
} from '../hooks/useTreasury';
import type { ColumnDef } from '@tanstack/react-table';
import type { TreasuryDeal, DealStatus, DealType, BookDealRequest } from '../api/tradingApi';
import { useDealerDesks } from '../hooks/useTreasury';

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

function BookDealDialog({ open, onClose }: BookDealDialogProps) {
  const { data: desks = [] } = useDealerDesks();
  const bookDeal = useBookDeal();

  const [form, setForm] = useState<BookDealRequest>({
    type: 'FX',
    counterparty: '',
    currency: 'NGN',
    amount: 0,
    rate: 0,
    maturityDate: '',
    deskId: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BookDealRequest, string>>>({});

  if (!open) return null;

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.counterparty.trim()) e.counterparty = 'Counterparty is required';
    if (!form.amount || form.amount <= 0) e.amount = 'Amount must be positive';
    if (!form.rate || form.rate <= 0) e.rate = 'Rate must be positive';
    if (!form.maturityDate) e.maturityDate = 'Maturity date is required';
    if (!form.deskId) e.deskId = 'Desk is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await bookDeal.mutateAsync(form);
    onClose();
    setForm({ type: 'FX', counterparty: '', currency: 'NGN', amount: 0, rate: 0, maturityDate: '', deskId: '' });
  };

  const field = (label: string, key: keyof BookDealRequest, content: React.ReactNode) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {content}
      {errors[key] && <p className="text-xs text-red-600 mt-0.5">{errors[key]}</p>}
    </div>
  );

  const inputCls = (key: keyof BookDealRequest) =>
    cn(
      'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40',
      errors[key] ? 'border-red-400' : 'border-border',
    );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6">
          <h2 className="text-lg font-semibold mb-5">Book New Deal</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {field(
                'Deal Type',
                'type',
                <select
                  className={inputCls('type')}
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DealType }))}
                >
                  {(['FX', 'REPO', 'BOND', 'MM', 'TB'] as DealType[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>,
              )}
              {field(
                'Currency',
                'currency',
                <select
                  className={inputCls('currency')}
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {['NGN', 'USD', 'EUR', 'GBP', 'XOF', 'ZAR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>,
              )}
            </div>

            {field(
              'Counterparty',
              'counterparty',
              <input
                className={inputCls('counterparty')}
                placeholder="e.g. Access Bank PLC"
                value={form.counterparty}
                onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))}
              />,
            )}

            <div className="grid grid-cols-2 gap-4">
              {field(
                'Amount',
                'amount',
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls('amount')}
                  placeholder="0.00"
                  value={form.amount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                />,
              )}
              {field(
                'Rate (%)',
                'rate',
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className={inputCls('rate')}
                  placeholder="0.000"
                  value={form.rate || ''}
                  onChange={(e) => setForm((f) => ({ ...f, rate: parseFloat(e.target.value) || 0 }))}
                />,
              )}
            </div>

            {field(
              'Maturity Date',
              'maturityDate',
              <input
                type="date"
                className={inputCls('maturityDate')}
                value={form.maturityDate}
                onChange={(e) => setForm((f) => ({ ...f, maturityDate: e.target.value }))}
              />,
            )}

            {field(
              'Dealer Desk',
              'deskId',
              <select
                className={inputCls('deskId')}
                value={form.deskId}
                onChange={(e) => setForm((f) => ({ ...f, deskId: e.target.value }))}
              >
                <option value="">Select desk…</option>
                {desks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>,
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bookDeal.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {bookDeal.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Book Deal
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
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const { data: deals = [], isLoading } = useTreasuryDeals(
    statusFilter !== 'ALL' ? { status: statusFilter } : undefined,
  );
  const confirmDeal = useConfirmDeal();
  const settleDeal = useSettleDeal();

  const filtered = deals.filter((d) => {
    if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
    if (dateFrom && d.bookedAt < dateFrom) return false;
    if (dateTo && d.bookedAt > dateTo + 'T23:59:59') return false;
    return true;
  });

  const handleAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'confirm') {
      await confirmDeal.mutateAsync(pendingAction.deal.id);
    } else {
      await settleDeal.mutateAsync(pendingAction.deal.id);
    }
    setPendingAction(null);
  };

  const isMutating = confirmDeal.isPending || settleDeal.isPending;

  const columns: ColumnDef<TreasuryDeal, any>[] = [
    {
      accessorKey: 'dealRef',
      header: 'Deal Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.original.dealRef}</span>
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
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {formatMoney(row.original.amount, row.original.currency)}
        </span>
      ),
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
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 border rounded-lg">
          <div>
            <label className="text-xs font-medium text-muted-foreground mr-2">Status</label>
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            >
              {(['ALL', 'BOOKED', 'CONFIRMED', 'SETTLED', 'CANCELLED'] as FilterStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mr-2">Type</label>
            <select
              className={selectCls}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
            >
              {(['ALL', 'FX', 'REPO', 'BOND', 'MM', 'TB'] as FilterType[]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              className={inputCls}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              className={inputCls}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
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
          />
          {!isLoading && filtered.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No deals match your filters"
              description="Try adjusting status, type, or date filters."
              action={
                statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? {
                      label: 'Clear Filters',
                      onClick: () => {
                        setStatusFilter('ALL');
                        setTypeFilter('ALL');
                        setDateFrom('');
                        setDateTo('');
                      },
                    }
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
