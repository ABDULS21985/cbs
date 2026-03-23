import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, DollarSign, Briefcase, CheckCircle2, XCircle, MoreHorizontal,
  Calendar, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { MaEngagement } from '../types/maAdvisory';
import type { CreateMaEngagementPayload, MaEngagementType, MaRole } from '../api/advisoryApi';
import {
  useAllMaEngagements,
  useCreateMaEngagement,
  useUpdateMaMilestone,
  useRecordMaFee,
  useCloseMaEngagement,
  useTerminateMaEngagement,
  useMaAdvisoryPipeline,
  useMaAdvisoryRevenue,
} from '../hooks/useAdvisory';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGAGEMENT_TYPES: { value: MaEngagementType; label: string }[] = [
  { value: 'BUY_SIDE', label: 'Buy-Side Advisory' },
  { value: 'SELL_SIDE', label: 'Sell-Side Advisory' },
  { value: 'MERGER', label: 'Merger' },
  { value: 'DIVESTITURE', label: 'Divestiture' },
  { value: 'MANAGEMENT_BUYOUT', label: 'Management Buyout' },
  { value: 'LEVERAGED_BUYOUT', label: 'Leveraged Buyout' },
  { value: 'RESTRUCTURING', label: 'Restructuring' },
  { value: 'FAIRNESS_OPINION', label: 'Fairness Opinion' },
  { value: 'VALUATION_ONLY', label: 'Valuation Only' },
];

const ROLES: { value: MaRole; label: string }[] = [
  { value: 'SOLE_ADVISER', label: 'Sole Adviser' },
  { value: 'JOINT_ADVISER', label: 'Joint Adviser' },
  { value: 'BUY_SIDE_ADVISER', label: 'Buy-Side Adviser' },
  { value: 'SELL_SIDE_ADVISER', label: 'Sell-Side Adviser' },
  { value: 'FAIRNESS_OPINION_PROVIDER', label: 'Fairness Opinion Provider' },
  { value: 'VALUATION_ADVISER', label: 'Valuation Adviser' },
];

const MILESTONE_FIELDS: { value: string; label: string }[] = [
  { value: 'mandateDate', label: 'Mandate Date' },
  { value: 'informationMemoDate', label: 'Information Memo Date' },
  { value: 'dataRoomOpenDate', label: 'Data Room Open Date' },
  { value: 'indicativeBidDeadline', label: 'Indicative Bid Deadline' },
  { value: 'dueDiligenceStart', label: 'Due Diligence Start' },
  { value: 'dueDiligenceEnd', label: 'Due Diligence End' },
  { value: 'bindingBidDeadline', label: 'Binding Bid Deadline' },
  { value: 'signingDate', label: 'Signing Date' },
  { value: 'regulatoryApprovalDate', label: 'Regulatory Approval Date' },
  { value: 'closingDate', label: 'Closing Date' },
];

const STATUS_LABELS: Record<string, string> = {
  PITCHING: 'Pitching',
  MANDATED: 'Mandated',
  PREPARATION: 'Preparation',
  MARKETING: 'Marketing',
  DUE_DILIGENCE: 'Due Diligence',
  NEGOTIATION: 'Negotiation',
  SIGNING: 'Signing',
  REGULATORY_CLEARANCE: 'Regulatory Clearance',
  CLOSED: 'Closed',
  TERMINATED: 'Terminated',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CHF'];

// ─── Dialog helpers ────────────────────────────────────────────────────────────

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

// ─── Create Engagement Dialog ─────────────────────────────────────────────────

function CreateEngagementDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateMaEngagement();
  const [form, setForm] = useState<Partial<CreateMaEngagementPayload>>({
    transactionCurrency: 'USD',
    expenseReimbursement: true,
  });

  const set = (k: keyof CreateMaEngagementPayload, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.engagementName || !form.engagementType || !form.clientName || !form.ourRole) {
      toast.error('Fill in all required fields');
      return;
    }
    create.mutate(form as CreateMaEngagementPayload, {
      onSuccess: (engagement) => {
        toast.success(`Engagement ${engagement.engagementCode} created`);
        onClose();
      },
      onError: () => toast.error('Failed to create engagement'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>New M&A Engagement</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Engagement Name *">
          <input className={inputCls} value={form.engagementName || ''} onChange={e => set('engagementName', e.target.value)} placeholder="Project Eagle — Acquisition of Target Co." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type *">
            <select className={selectCls} value={form.engagementType || ''} onChange={e => set('engagementType', e.target.value as MaEngagementType)}>
              <option value="">Select type…</option>
              {ENGAGEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Our Role *">
            <select className={selectCls} value={form.ourRole || ''} onChange={e => set('ourRole', e.target.value as MaRole)}>
              <option value="">Select role…</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client Name *">
            <input className={inputCls} value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} placeholder="ABC Corporation Ltd" />
          </Field>
          <Field label="Client Sector">
            <input className={inputCls} value={form.clientSector || ''} onChange={e => set('clientSector', e.target.value)} placeholder="Financial Services" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target Name">
            <input className={inputCls} value={form.targetName || ''} onChange={e => set('targetName', e.target.value)} placeholder="Target Co." />
          </Field>
          <Field label="Target Country (ISO 3)">
            <input className={inputCls} maxLength={3} value={form.targetCountry || ''} onChange={e => set('targetCountry', e.target.value.toUpperCase())} placeholder="NGA" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <select className={selectCls} value={form.transactionCurrency || 'USD'} onChange={e => set('transactionCurrency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Estimated Deal Value">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.estimatedDealValue ?? ''} onChange={e => set('estimatedDealValue', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
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
        <div className="grid grid-cols-3 gap-3">
          <Field label="Success Fee %">
            <input type="number" min="0" max="1" step="0.0001" className={inputCls} value={form.successFeePct ?? ''} onChange={e => set('successFeePct', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.0200" />
          </Field>
          <Field label="Min Success Fee">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.successFeeMin ?? ''} onChange={e => set('successFeeMin', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
          </Field>
          <Field label="Max Success Fee">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.successFeeCap ?? ''} onChange={e => set('successFeeCap', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="expReimb" checked={form.expenseReimbursement ?? true} onChange={e => set('expenseReimbursement', e.target.checked)} />
          <label htmlFor="expReimb" className="text-sm">Expense Reimbursement</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {create.isPending ? 'Creating…' : 'Create Engagement'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Update Milestone Dialog ──────────────────────────────────────────────────

function UpdateMilestoneDialog({ engagement, onClose }: { engagement: MaEngagement; onClose: () => void }) {
  const update = useUpdateMaMilestone();
  const [field, setField] = useState('mandateDate');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { toast.error('Select a date'); return; }
    update.mutate({ code: engagement.engagementCode, field, date }, {
      onSuccess: () => { toast.success('Milestone updated'); onClose(); },
      onError: () => toast.error('Failed to update milestone'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>Update Milestone — {engagement.engagementCode}</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Milestone">
          <select className={selectCls} value={field} onChange={e => setField(e.target.value)}>
            {MILESTONE_FIELDS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} required />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={update.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {update.isPending ? 'Saving…' : 'Save Milestone'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Record Fee Dialog ────────────────────────────────────────────────────────

function RecordFeeDialog({ engagement, onClose }: { engagement: MaEngagement; onClose: () => void }) {
  const record = useRecordMaFee();
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    record.mutate({ code: engagement.engagementCode, amount: amt }, {
      onSuccess: (updated) => {
        toast.success(`Fee recorded. Total fees: ${formatMoney(updated.totalFeesEarned, updated.transactionCurrency)}`);
        onClose();
      },
      onError: () => toast.error('Failed to record fee'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>Record Fee — {engagement.engagementCode}</DialogTitle>
      <p className="text-xs text-muted-foreground mb-4">
        Current total fees: <strong>{formatMoney(engagement.totalFeesEarned, engagement.transactionCurrency)}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`Fee Amount (${engagement.transactionCurrency})`}>
          <input type="number" min="0.01" step="0.01" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={record.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {record.isPending ? 'Recording…' : 'Record Fee'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Close Engagement Dialog ──────────────────────────────────────────────────

function CloseEngagementDialog({ engagement, onClose }: { engagement: MaEngagement; onClose: () => void }) {
  const close = useCloseMaEngagement();
  const [actualDealValue, setActualDealValue] = useState(
    engagement.estimatedDealValue ? String(engagement.estimatedDealValue) : '',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(actualDealValue);
    if (!val || val <= 0) { toast.error('Enter the actual deal value'); return; }
    close.mutate({ code: engagement.engagementCode, actualDealValue: val }, {
      onSuccess: (updated) => {
        toast.success(`Engagement closed. Total fees: ${formatMoney(updated.totalFeesEarned, updated.transactionCurrency)}`);
        onClose();
      },
      onError: () => toast.error('Failed to close engagement'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>Close Engagement — {engagement.engagementCode}</DialogTitle>
      <p className="text-xs text-muted-foreground mb-4">
        Closing will calculate the success fee based on the actual deal value and current fee structure.
        {engagement.successFeePct ? ` Success fee: ${(engagement.successFeePct * 100).toFixed(2)}% of deal value` : ''}
        {engagement.successFeeMin ? ` (min ${formatMoney(engagement.successFeeMin, engagement.transactionCurrency)})` : ''}
        {engagement.successFeeCap ? ` (cap ${formatMoney(engagement.successFeeCap, engagement.transactionCurrency)})` : ''}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`Actual Deal Value (${engagement.transactionCurrency}) *`}>
          <input type="number" min="0.01" step="0.01" className={inputCls} value={actualDealValue} onChange={e => setActualDealValue(e.target.value)} placeholder="0.00" required />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={close.isPending} className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
            {close.isPending ? 'Closing…' : 'Close Engagement'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Terminate Dialog ─────────────────────────────────────────────────────────

function TerminateDialog({ engagement, onClose }: { engagement: MaEngagement; onClose: () => void }) {
  const terminate = useTerminateMaEngagement();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    terminate.mutate({ code: engagement.engagementCode, reason: reason || undefined }, {
      onSuccess: () => { toast.success('Engagement terminated'); onClose(); },
      onError: () => toast.error('Failed to terminate engagement'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>Terminate Engagement — {engagement.engagementCode}</DialogTitle>
      <p className="text-sm text-destructive mb-4">
        This will permanently set the engagement status to TERMINATED. This action cannot be undone.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Reason (optional)">
          <textarea className={`${inputCls} resize-none`} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Client withdrew from transaction" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={terminate.isPending} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
            {terminate.isPending ? 'Terminating…' : 'Terminate'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

type ActiveDialog =
  | { type: 'milestone'; engagement: MaEngagement }
  | { type: 'fee'; engagement: MaEngagement }
  | { type: 'close'; engagement: MaEngagement }
  | { type: 'terminate'; engagement: MaEngagement }
  | null;

function RowActions({ engagement, onAction }: { engagement: MaEngagement; onAction: (d: ActiveDialog) => void }) {
  const [open, setOpen] = useState(false);
  const isClosed = engagement.status === 'CLOSED' || engagement.status === 'TERMINATED';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1 rounded hover:bg-muted"
        title="Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 text-sm">
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'milestone', engagement }); }}
            >
              <Calendar className="w-3.5 h-3.5" /> Update Milestone
            </button>
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'fee', engagement }); }}
            >
              <DollarSign className="w-3.5 h-3.5" /> Record Fee
            </button>
            <div className="border-t border-border my-1" />
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted text-green-700 dark:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'close', engagement }); }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Close Engagement
            </button>
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted text-destructive disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'terminate', engagement }); }}
            >
              <XCircle className="w-3.5 h-3.5" /> Terminate
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MaAdvisoryPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const now = new Date();
  const fromYtd = `${now.getFullYear()}-01-01`;
  const toYtd = now.toISOString().slice(0, 10);

  const { data: engagements = [], isLoading } = useAllMaEngagements();
  const { data: pipeline = {} } = useMaAdvisoryPipeline();
  const { data: revenueYtd = 0 } = useMaAdvisoryRevenue(fromYtd, toYtd);

  const filtered = useMemo(() => {
    let result = engagements;
    if (statusFilter) result = result.filter(e => e.status === statusFilter);
    if (typeFilter) result = result.filter(e => e.engagementType === typeFilter);
    return result;
  }, [engagements, statusFilter, typeFilter]);

  const activeCount = engagements.filter(e => !['CLOSED', 'TERMINATED'].includes(e.status)).length;
  const closedCount = engagements.filter(e => e.status === 'CLOSED').length;
  const totalPipelineValue = engagements
    .filter(e => !['CLOSED', 'TERMINATED'].includes(e.status))
    .reduce((s, e) => s + (e.estimatedDealValue || 0), 0);

  const cols: ColumnDef<MaEngagement, any>[] = [
    {
      accessorKey: 'engagementCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.engagementCode}</span>,
    },
    { accessorKey: 'engagementName', header: 'Engagement', size: 220 },
    { accessorKey: 'clientName', header: 'Client' },
    {
      accessorKey: 'targetName',
      header: 'Target',
      cell: ({ row }) => row.original.targetName || '—',
    },
    {
      accessorKey: 'engagementType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.engagementType} />,
    },
    { accessorKey: 'leadBanker', header: 'Lead Banker', cell: ({ row }) => row.original.leadBanker || '—' },
    {
      accessorKey: 'estimatedDealValue',
      header: 'Est. Value',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.estimatedDealValue
            ? formatMoney(row.original.estimatedDealValue, row.original.transactionCurrency)
            : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'totalFeesEarned',
      header: 'Fees Earned',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-green-700 dark:text-green-400">
          {formatMoney(row.original.totalFeesEarned || 0, row.original.transactionCurrency)}
        </span>
      ),
    },
    {
      accessorKey: 'mandateDate',
      header: 'Mandate Date',
      cell: ({ row }) => row.original.mandateDate ? formatDate(row.original.mandateDate) : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
          <RowActions engagement={row.original} onAction={setActiveDialog} />
        </RoleGuard>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="M&A Advisory"
        subtitle="Mergers, acquisitions, and advisory mandate management"
        actions={
          <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Engagement
            </button>
          </RoleGuard>
        }
      />

      <div className="page-container space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Mandates" value={activeCount} format="number" icon={Briefcase} loading={isLoading} />
          <StatCard label="Pipeline Value" value={totalPipelineValue} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Revenue YTD" value={revenueYtd} format="money" compact icon={TrendingUp} />
          <StatCard label="Closed Deals" value={closedCount} format="number" icon={CheckCircle2} loading={isLoading} />
        </div>

        {/* Pipeline summary */}
        {Object.keys(pipeline).length > 0 && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">Pipeline by Stage</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(pipeline).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 border-border hover:bg-muted'
                  }`}
                >
                  {STATUS_LABELS[status] ?? status} · {count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Types</option>
            {ENGAGEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {(statusFilter || typeFilter) && (
            <button onClick={() => { setStatusFilter(''); setTypeFilter(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <DataTable
          columns={cols}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="ma-advisory-engagements"
          emptyMessage="No M&A engagements found"
        />
      </div>

      {/* Dialogs */}
      {showCreate && <CreateEngagementDialog onClose={() => setShowCreate(false)} />}
      {activeDialog?.type === 'milestone' && (
        <UpdateMilestoneDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog?.type === 'fee' && (
        <RecordFeeDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog?.type === 'close' && (
        <CloseEngagementDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog?.type === 'terminate' && (
        <TerminateDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
    </>
  );
}

