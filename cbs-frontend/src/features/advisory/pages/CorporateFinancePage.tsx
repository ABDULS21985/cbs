import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, DollarSign, Briefcase, CheckCircle2, BarChart2, MoreHorizontal, FileText, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import {
  useAllCorporateFinanceEngagements,
  useCreateCFEngagement,
  useCloseCFEngagement,
  useDeliverDraft,
  useFinalizeDelivery,
  useRecordFeeInvoice,
  useRecordPayment,
} from '../hooks/useAdvisory';
import type {
  CorporateFinanceEngagement,
  CorporateFinanceType,
  CorporateFinanceRole,
  CorporateFinanceStatus,
  CreateCFEngagementPayload,
} from '../api/advisoryApi';

const CF_TYPES: { value: CorporateFinanceType; label: string }[] = [
  { value: 'DEBT_RESTRUCTURING', label: 'Debt Restructuring' },
  { value: 'EQUITY_RESTRUCTURING', label: 'Equity Restructuring' },
  { value: 'CAPITAL_RAISE_ADVISORY', label: 'Capital Raise Advisory' },
  { value: 'BUSINESS_VALUATION', label: 'Business Valuation' },
  { value: 'FINANCIAL_MODELLING', label: 'Financial Modelling' },
  { value: 'FEASIBILITY_STUDY', label: 'Feasibility Study' },
  { value: 'STRATEGIC_REVIEW', label: 'Strategic Review' },
  { value: 'TURNAROUND_ADVISORY', label: 'Turnaround Advisory' },
  { value: 'REFINANCING', label: 'Refinancing' },
  { value: 'RECAPITALIZATION', label: 'Recapitalization' },
];

const CF_ROLES: { value: CorporateFinanceRole; label: string }[] = [
  { value: 'SOLE_ADVISER', label: 'Sole Adviser' },
  { value: 'LEAD_ADVISER', label: 'Lead Adviser' },
  { value: 'JOINT_ADVISER', label: 'Joint Adviser' },
  { value: 'INDEPENDENT_ADVISER', label: 'Independent Adviser' },
];

const STATUS_FLOW: CorporateFinanceStatus[] = [
  'PROPOSAL', 'MANDATED', 'ANALYSIS', 'DRAFT_DELIVERED', 'FINAL_DELIVERED', 'EXECUTION', 'COMPLETED',
];

const STATUS_LABELS: Record<string, string> = {
  PROPOSAL: 'Proposal',
  MANDATED: 'Mandated',
  ANALYSIS: 'Analysis',
  DRAFT_DELIVERED: 'Draft Delivered',
  FINAL_DELIVERED: 'Final Delivered',
  EXECUTION: 'Execution',
  COMPLETED: 'Completed',
  TERMINATED: 'Terminated',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CHF'];

// ─── Dialog helpers ──────────────────────────────────────────────────────────

function DialogBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}

function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mb-4">{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
const selectCls = `${inputCls} cursor-pointer`;

// ─── Stage progress steps ─────────────────────────────────────────────────────

function StageProgress({ status }: { status: string }) {
  const idx = STATUS_FLOW.indexOf(status as CorporateFinanceStatus);
  const current = idx >= 0 ? idx : 0;
  return (
    <div className="flex items-center gap-0.5">
      {STATUS_FLOW.map((s, i) => (
        <div
          key={s}
          title={STATUS_LABELS[s] ?? s}
          className={`h-2 w-4 rounded-sm ${i <= current ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

function RowActions({ row }: { row: CorporateFinanceEngagement }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'invoice' | 'payment' | null>(null);
  const [amount, setAmount] = useState('');

  const deliverDraft = useDeliverDraft();
  const finalize = useFinalizeDelivery();
  const invoice = useRecordFeeInvoice();
  const payment = useRecordPayment();
  const close = useCloseCFEngagement();

  const isClosed = row.status === 'COMPLETED' || row.status === 'TERMINATED';

  function handleAction(action: string) {
    setOpen(false);
    if (action === 'draft') {
      deliverDraft.mutate(row.engagementCode, {
        onSuccess: () => toast.success('Draft delivered'),
        onError: () => toast.error('Failed to deliver draft'),
      });
    } else if (action === 'finalize') {
      finalize.mutate(row.engagementCode, {
        onSuccess: () => toast.success('Delivery finalized'),
        onError: () => toast.error('Failed to finalize'),
      });
    } else if (action === 'invoice') {
      setModal('invoice');
    } else if (action === 'payment') {
      setModal('payment');
    } else if (action === 'close') {
      close.mutate(row.engagementCode, {
        onSuccess: () => toast.success('Engagement completed'),
        onError: () => toast.error('Failed to close engagement'),
      });
    }
  }

  function submitModal() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (modal === 'invoice') {
      invoice.mutate({ code: row.engagementCode, amount: amt }, {
        onSuccess: () => toast.success('Invoice recorded'),
        onError: () => toast.error('Failed to record invoice'),
      });
    } else if (modal === 'payment') {
      payment.mutate({ code: row.engagementCode, amount: amt }, {
        onSuccess: () => toast.success('Payment recorded'),
        onError: () => toast.error('Failed to record payment'),
      });
    }
    setModal(null);
    setAmount('');
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-muted" title="Actions">
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 text-sm">
              <button
                disabled={isClosed}
                className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => handleAction('draft')}
              >
                <FileText className="w-3.5 h-3.5" /> Deliver Draft
              </button>
              <button
                disabled={isClosed}
                className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => handleAction('finalize')}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Finalize
              </button>
              <div className="border-t border-border my-1" />
              <button
                disabled={isClosed}
                className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => handleAction('invoice')}
              >
                <CreditCard className="w-3.5 h-3.5" /> Record Invoice
              </button>
              <button
                disabled={isClosed}
                className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => handleAction('payment')}
              >
                <DollarSign className="w-3.5 h-3.5" /> Record Payment
              </button>
              <div className="border-t border-border my-1" />
              <button
                disabled={isClosed}
                className="w-full px-3 py-1.5 text-left hover:bg-muted text-green-700 dark:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => handleAction('close')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </button>
            </div>
          </>
        )}
      </div>

      {modal && (
        <DialogBackdrop>
          <DialogTitle>{modal === 'invoice' ? 'Record Invoice' : 'Record Payment'}</DialogTitle>
          <p className="text-xs text-muted-foreground mb-4">
            Engagement: <strong>{row.engagementCode}</strong> · Client: <strong>{row.clientName}</strong>
            {modal === 'invoice' && <><br />Total invoiced: <strong>{formatMoney(row.totalFeesInvoiced, row.currency)}</strong></>}
            {modal === 'payment' && <><br />Total paid: <strong>{formatMoney(row.totalFeesPaid, row.currency)}</strong></>}
          </p>
          <Field label={`Amount (${row.currency}) *`}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={inputCls}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </Field>
          <div className="flex gap-2 justify-end pt-4">
            <button onClick={() => { setModal(null); setAmount(''); }} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
            <button onClick={submitModal} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Submit</button>
          </div>
        </DialogBackdrop>
      )}
    </>
  );
}

// ─── New Mandate Dialog ───────────────────────────────────────────────────────

function NewMandateDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateCFEngagement();
  const [form, setForm] = useState<Partial<CreateCFEngagementPayload>>({
    currency: 'USD',
  });

  const set = (k: keyof CreateCFEngagementPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.engagementName || !form.engagementType || !form.clientName || !form.ourRole) {
      toast.error('Fill in all required fields');
      return;
    }
    create.mutate(form as CreateCFEngagementPayload, {
      onSuccess: (eng) => {
        toast.success(`Engagement ${eng.engagementCode} created`);
        onClose();
      },
      onError: () => toast.error('Failed to create engagement'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>New Corporate Finance Mandate</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Engagement Name *">
          <input className={inputCls} value={form.engagementName || ''} onChange={e => set('engagementName', e.target.value)} placeholder="Debt Restructuring — ABC Corp" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type *">
            <select className={selectCls} value={form.engagementType || ''} onChange={e => set('engagementType', e.target.value as CorporateFinanceType)}>
              <option value="">Select type...</option>
              {CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Our Role *">
            <select className={selectCls} value={form.ourRole || ''} onChange={e => set('ourRole', e.target.value as CorporateFinanceRole)}>
              <option value="">Select role...</option>
              {CF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client Name *">
            <input className={inputCls} value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} placeholder="ABC Corporation" />
          </Field>
          <Field label="Client Sector">
            <input className={inputCls} value={form.clientSector || ''} onChange={e => set('clientSector', e.target.value)} placeholder="Financial Services" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deal Value Estimate">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.dealValueEstimate ?? ''} onChange={e => set('dealValueEstimate', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
          </Field>
          <Field label="Currency">
            <select className={selectCls} value={form.currency || 'USD'} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lead Banker">
            <input className={inputCls} value={form.leadBanker || ''} onChange={e => set('leadBanker', e.target.value)} placeholder="Jane Smith" />
          </Field>
          <Field label="Retainer Fee">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.retainerFee ?? ''} onChange={e => set('retainerFee', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
          </Field>
        </div>
        <Field label="Scope of Work">
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.scopeOfWork || ''} onChange={e => set('scopeOfWork', e.target.value)} placeholder="Describe the scope of work..." />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create Engagement'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CorporateFinancePage() {
  const { data: engagements = [], isLoading } = useAllCorporateFinanceEngagements();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    let result = engagements;
    if (filterType) result = result.filter(e => e.engagementType === filterType);
    if (filterStatus) result = result.filter(e => e.status === filterStatus);
    return result;
  }, [engagements, filterType, filterStatus]);

  const statuses = [...new Set(engagements.map(e => e.status))];
  const activeCount = engagements.filter(e => !['COMPLETED', 'TERMINATED'].includes(e.status)).length;
  const totalFees = engagements.reduce((s, e) => s + (e.totalFeesInvoiced || 0), 0);
  const completedThisYear = engagements.filter(e => {
    if (e.status !== 'COMPLETED' || !e.completionDate) return false;
    return new Date(e.completionDate).getFullYear() === new Date().getFullYear();
  }).length;
  const avgDealSize = engagements.length > 0
    ? engagements.reduce((s, e) => s + (e.dealValueEstimate || 0), 0) / engagements.length
    : 0;

  const columns: ColumnDef<CorporateFinanceEngagement, unknown>[] = [
    {
      accessorKey: 'engagementCode',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.engagementCode}</span>
      ),
    },
    { accessorKey: 'engagementName', header: 'Engagement', size: 200 },
    { accessorKey: 'clientName', header: 'Client' },
    {
      accessorKey: 'engagementType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.engagementType} />,
    },
    {
      accessorKey: 'dealValueEstimate',
      header: 'Deal Value',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.dealValueEstimate ? formatMoney(row.original.dealValueEstimate, row.original.currency) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'totalFeesInvoiced',
      header: 'Invoiced',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-green-700 dark:text-green-400">
          {formatMoney(row.original.totalFeesInvoiced || 0, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} dot />
          <StageProgress status={row.original.status} />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
          <RowActions row={row.original} />
        </RoleGuard>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Corporate Finance"
        subtitle="Restructuring, valuation, feasibility, and capital advisory mandates"
        actions={
          <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Mandate
            </button>
          </RoleGuard>
        }
      />
      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Mandates" value={activeCount} format="number" icon={Briefcase} loading={isLoading} />
          <StatCard label="Total Invoiced" value={totalFees} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Completed This Year" value={completedThisYear} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Avg Deal Size" value={avgDealSize} format="money" compact icon={BarChart2} loading={isLoading} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
          </select>
          {(filterType || filterStatus) && (
            <button onClick={() => { setFilterType(''); setFilterStatus(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear filters
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="corporate-finance-mandates"
          emptyMessage="No corporate finance mandates found"
        />
      </div>

      {showNew && <NewMandateDialog onClose={() => setShowNew(false)} />}
    </>
  );
}
