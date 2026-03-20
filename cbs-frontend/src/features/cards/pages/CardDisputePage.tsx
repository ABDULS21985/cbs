import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle, CheckCircle2, Clock, Scale, Plus, X, Loader2, Search, XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useDisputesByStatus,
  useDisputesDashboard,
  useDisputeSlaCheck,
  useInitiateDispute,
} from '../hooks/useCardsExt';
import type { CardDispute, DisputeStatus } from '../types/cardExt';

const ALL_STATUSES: DisputeStatus[] = ['OPEN', 'INVESTIGATING', 'CHARGEBACK_FILED', 'REPRESENTMENT', 'ARBITRATION', 'RESOLVED', 'CLOSED'];

const STATUS_WORKFLOW_COLORS: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  INVESTIGATING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CHARGEBACK_FILED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  REPRESENTMENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ARBITRATION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ESCALATED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

// ── File New Dispute Dialog ─────────────────────────────────────────────────

function FileDisputeDialog({ onClose }: { onClose: () => void }) {
  const initiate = useInitiateDispute();
  const [form, setForm] = useState({
    cardId: 0, customerId: 0, accountId: 0,
    transactionRef: '', transactionDate: new Date().toISOString().slice(0, 10),
    transactionAmount: 0, transactionCurrency: 'NGN',
    merchantName: '', merchantId: '',
    disputeType: 'UNAUTHORIZED', disputeReason: '', disputeAmount: 0,
    cardScheme: 'VISA',
  });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    initiate.mutate(form, {
      onSuccess: () => { toast.success('Dispute filed successfully'); onClose(); },
      onError: () => toast.error('Failed to file dispute'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">File New Dispute</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Card ID *</label>
              <input type="number" value={form.cardId || ''} onChange={e => setForm(p => ({ ...p, cardId: Number(e.target.value) }))} className={fc} required /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
              <input type="number" value={form.customerId || ''} onChange={e => setForm(p => ({ ...p, customerId: Number(e.target.value) }))} className={fc} required /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Account ID *</label>
              <input type="number" value={form.accountId || ''} onChange={e => setForm(p => ({ ...p, accountId: Number(e.target.value) }))} className={fc} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Transaction Ref</label>
              <input value={form.transactionRef} onChange={e => setForm(p => ({ ...p, transactionRef: e.target.value }))} placeholder="TXN-XXXXX" className={fc} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Transaction Date *</label>
              <input type="date" value={form.transactionDate} onChange={e => setForm(p => ({ ...p, transactionDate: e.target.value }))} className={fc} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Transaction Amount *</label>
              <input type="number" step="0.01" value={form.transactionAmount || ''} onChange={e => setForm(p => ({ ...p, transactionAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} required /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Card Scheme *</label>
              <select value={form.cardScheme} onChange={e => setForm(p => ({ ...p, cardScheme: e.target.value }))} className={fc}>
                {['VISA', 'MASTERCARD', 'VERVE'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Merchant Name</label>
              <input value={form.merchantName} onChange={e => setForm(p => ({ ...p, merchantName: e.target.value }))} className={fc} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Dispute Type *</label>
              <select value={form.disputeType} onChange={e => setForm(p => ({ ...p, disputeType: e.target.value }))} className={fc}>
                {['UNAUTHORIZED', 'FRAUD', 'SERVICE_NOT_RENDERED', 'DUPLICATE', 'ATM_FAILED', 'COUNTERFEIT', 'OTHER'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select></div>
          </div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Disputed Amount *</label>
            <input type="number" step="0.01" value={form.disputeAmount || ''} onChange={e => setForm(p => ({ ...p, disputeAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono w-48')} required /></div>
          <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Dispute Reason *</label>
            <textarea value={form.disputeReason} onChange={e => setForm(p => ({ ...p, disputeReason: e.target.value }))} rows={3} className={fc} required /></div>
          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={initiate.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
              {initiate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} File Dispute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function CardDisputePage() {
  useEffect(() => { document.title = 'Disputes & Chargebacks | CBS'; }, []);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [showFile, setShowFile] = useState(false);

  const { data: disputes = [], isLoading } = useDisputesByStatus(statusFilter);
  const { data: dashboard } = useDisputesDashboard();
  const slaCheck = useDisputeSlaCheck();

  const stats = dashboard as Record<string, unknown> | undefined;
  const openCount = (stats?.openCount as number) ?? disputes.filter(d => d.status === 'OPEN' || d.status === 'INVESTIGATING').length;
  const chargebackCount = (stats?.chargebackCount as number) ?? disputes.filter(d => d.status === 'CHARGEBACK_FILED').length;
  const totalAmount = (stats?.totalDisputedAmount as number) ?? disputes.reduce((s, d) => s + (d.disputeAmount ?? 0), 0);
  const breachedCount = (stats?.slaBreachedCount as number) ?? disputes.filter(d => d.isSlaBreached).length;
  const avgDays = (stats?.avgResolutionDays as number) ?? 0;

  useEffect(() => { slaCheck.mutate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef<CardDispute, unknown>[]>(() => [
    { accessorKey: 'disputeRef', header: 'Dispute Ref', cell: ({ row }) => (
      <button onClick={e => { e.stopPropagation(); navigate(`/cards/disputes/${row.original.id}`); }}
        className="font-mono text-xs font-medium text-primary hover:underline">{row.original.disputeRef}</button>
    )},
    { accessorKey: 'merchantName', header: 'Merchant', cell: ({ row }) => <span className="text-sm">{row.original.merchantName ?? '—'}</span> },
    { accessorKey: 'cardScheme', header: 'Card', cell: ({ row }) => <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{row.original.cardScheme}</span> },
    { accessorKey: 'disputeAmount', header: 'Amount', cell: ({ row }) => <span className="text-sm font-mono text-red-600 dark:text-red-400">{formatMoney(row.original.disputeAmount ?? 0, row.original.disputeCurrency ?? 'NGN')}</span> },
    { accessorKey: 'disputeType', header: 'Type', cell: ({ row }) => <span className="text-xs">{(row.original.disputeType ?? '').replace(/_/g, ' ')}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_WORKFLOW_COLORS[row.original.status] || 'bg-gray-100 text-gray-600')}>
        {row.original.status.replace(/_/g, ' ')}
      </span>
    )},
    { accessorKey: 'createdAt', header: 'Filed', cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
    { accessorKey: 'isSlaBreached', header: 'SLA', cell: ({ row }) => row.original.isSlaBreached ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" /> },
    { accessorKey: 'assignedTo', header: 'Assigned', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.assignedTo ?? '—'}</span> },
    { id: 'daysOpen', header: 'Days', cell: ({ row }) => {
      const days = Math.floor((Date.now() - new Date(row.original.createdAt).getTime()) / 86400000);
      return <span className={cn('text-xs font-mono', days > 30 ? 'text-red-600' : days > 14 ? 'text-amber-600' : '')}>{days}d</span>;
    }},
  ], [navigate]);

  return (
    <>
      {showFile && <FileDisputeDialog onClose={() => setShowFile(false)} />}
      <PageHeader title="Disputes & Chargebacks" subtitle="Card transaction dispute lifecycle management"
        actions={<button onClick={() => setShowFile(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> File New Dispute</button>} />

      <div className="page-container space-y-6">
        {breachedCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">{breachedCount} dispute{breachedCount > 1 ? 's' : ''} breached SLA</p>
              <p className="text-xs text-red-600 dark:text-red-400/80">Immediate action required.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Open" value={openCount} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Investigating" value={disputes.filter(d => d.status === 'INVESTIGATING').length} format="number" icon={Search} loading={isLoading} />
          <StatCard label="Chargeback" value={chargebackCount} format="number" icon={Scale} loading={isLoading} />
          <StatCard label="SLA Breached" value={breachedCount} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Disputed ₦" value={totalAmount} format="money" compact icon={Scale} loading={isLoading} />
          <StatCard label="Avg Resolution" value={avgDays > 0 ? `${avgDays}d` : '—'} loading={isLoading} />
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40 border-border')}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <DataTable columns={columns} data={disputes} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="card-disputes"
          emptyMessage="No disputes found for this status" pageSize={15} onRowClick={row => navigate(`/cards/disputes/${row.id}`)} />
      </div>
    </>
  );
}
