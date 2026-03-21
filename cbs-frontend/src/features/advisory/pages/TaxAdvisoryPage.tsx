import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, DollarSign, Briefcase, CheckCircle2, MoreHorizontal, FileText, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import type {
  TaxAdvisoryEngagement,
  CreateTaxEngagementPayload,
  TaxEngagementType,
  TaxFeeBasis,
  TaxRiskRating,
} from '../api/advisoryApi';
import {
  useAllTaxEngagements,
  useCreateTaxEngagement,
  useDeliverOpinion,
  useCloseTaxEngagement,
  useTaxAdvisoryRevenue,
} from '../hooks/useAdvisory';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGAGEMENT_TYPES: { value: TaxEngagementType; label: string }[] = [
  { value: 'TAX_STRUCTURING', label: 'Tax Structuring' },
  { value: 'TRANSFER_PRICING', label: 'Transfer Pricing' },
  { value: 'TAX_DUE_DILIGENCE', label: 'Tax Due Diligence' },
  { value: 'TAX_COMPLIANCE_REVIEW', label: 'Tax Compliance Review' },
  { value: 'WITHHOLDING_TAX_ADVISORY', label: 'Withholding Tax Advisory' },
  { value: 'VAT_ADVISORY', label: 'VAT Advisory' },
  { value: 'TAX_DISPUTE', label: 'Tax Dispute' },
];

const FEE_BASES: { value: TaxFeeBasis; label: string }[] = [
  { value: 'FIXED', label: 'Fixed Fee' },
  { value: 'HOURLY', label: 'Hourly Rate' },
  { value: 'SUCCESS_FEE', label: 'Success Fee' },
  { value: 'RETAINER', label: 'Retainer' },
];

const RISK_RATINGS: { value: TaxRiskRating; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'AGGRESSIVE', label: 'Aggressive' },
];

const STATUS_LABELS: Record<string, string> = {
  PROPOSAL: 'Proposal',
  ENGAGED: 'Engaged',
  IN_PROGRESS: 'In Progress',
  OPINION_DELIVERED: 'Opinion Delivered',
  CLOSED: 'Closed',
  TERMINATED: 'Terminated',
};

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

function CreateTaxDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateTaxEngagement();
  const [form, setForm] = useState<Partial<CreateTaxEngagementPayload>>({});

  const set = (k: keyof CreateTaxEngagementPayload, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.engagementName || !form.engagementType || !form.clientName) {
      toast.error('Fill in all required fields');
      return;
    }
    create.mutate(form as CreateTaxEngagementPayload, {
      onSuccess: (engagement) => {
        toast.success(`Engagement ${engagement.engagementCode} created`);
        onClose();
      },
      onError: () => toast.error('Failed to create engagement'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>New Tax Advisory Engagement</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Engagement Name *">
          <input className={inputCls} value={form.engagementName || ''} onChange={e => set('engagementName', e.target.value)} placeholder="Transfer Pricing Review — FY2025" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Engagement Type *">
            <select className={selectCls} value={form.engagementType || ''} onChange={e => set('engagementType', e.target.value as TaxEngagementType)}>
              <option value="">Select type…</option>
              {ENGAGEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Risk Rating">
            <select className={selectCls} value={form.riskRating || ''} onChange={e => set('riskRating', e.target.value as TaxRiskRating)}>
              <option value="">Select…</option>
              {RISK_RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client Name *">
            <input className={inputCls} value={form.clientName || ''} onChange={e => set('clientName', e.target.value)} placeholder="Acme Nigeria Ltd" />
          </Field>
          <Field label="Tax Authority">
            <input className={inputCls} value={form.taxAuthority || ''} onChange={e => set('taxAuthority', e.target.value)} placeholder="FIRS / LIRS" />
          </Field>
        </div>
        <Field label="Lead Advisor">
          <input className={inputCls} value={form.leadAdvisor || ''} onChange={e => set('leadAdvisor', e.target.value)} placeholder="John Adeyemi" />
        </Field>
        <Field label="Scope Description">
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.scopeDescription || ''} onChange={e => set('scopeDescription', e.target.value)} placeholder="Describe the scope of the advisory engagement…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Advisory Fee">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.advisoryFee ?? ''} onChange={e => set('advisoryFee', e.target.value ? Number(e.target.value) : undefined)} placeholder="0.00" />
          </Field>
          <Field label="Fee Basis">
            <select className={selectCls} value={form.feeBasis || ''} onChange={e => set('feeBasis', e.target.value as TaxFeeBasis)}>
              <option value="">Select…</option>
              {FEE_BASES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Engagement Start Date">
          <input type="date" className={inputCls} value={form.engagementStartDate || ''} onChange={e => set('engagementStartDate', e.target.value)} />
        </Field>
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

// ─── Deliver Opinion Dialog ───────────────────────────────────────────────────

function DeliverOpinionDialog({ engagement, onClose }: { engagement: TaxAdvisoryEngagement; onClose: () => void }) {
  const deliver = useDeliverOpinion();
  const [opinion, setOpinion] = useState(engagement.opinion || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opinion.trim()) { toast.error('Enter the tax opinion'); return; }
    deliver.mutate({ code: engagement.engagementCode, opinion }, {
      onSuccess: () => { toast.success('Opinion delivered'); onClose(); },
      onError: () => toast.error('Failed to deliver opinion'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>Deliver Tax Opinion — {engagement.engagementCode}</DialogTitle>
      <p className="text-xs text-muted-foreground mb-4">
        Client: <strong>{engagement.clientName}</strong> · Type: <strong>{engagement.engagementType}</strong>
        {engagement.riskRating && ` · Risk: ${engagement.riskRating}`}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tax Opinion *">
          <textarea
            className={`${inputCls} resize-none font-mono text-xs`}
            rows={10}
            value={opinion}
            onChange={e => setOpinion(e.target.value)}
            placeholder="Based on our analysis of the applicable legislation and the facts presented, it is our opinion that…"
            required
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={deliver.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {deliver.isPending ? 'Delivering…' : 'Deliver Opinion'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Close Confirmation Dialog ────────────────────────────────────────────────

function CloseTaxDialog({ engagement, onClose }: { engagement: TaxAdvisoryEngagement; onClose: () => void }) {
  const close = useCloseTaxEngagement();

  const handleConfirm = () => {
    close.mutate(engagement.engagementCode, {
      onSuccess: () => { toast.success('Engagement closed'); onClose(); },
      onError: () => toast.error('Failed to close engagement'),
    });
  };

  return (
    <DialogBackdrop>
      <DialogTitle>Close Engagement — {engagement.engagementCode}</DialogTitle>
      <p className="text-sm mb-4">
        Close <strong>{engagement.engagementName}</strong> for <strong>{engagement.clientName}</strong>?
        The engagement end date will be set to today.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
        <button onClick={handleConfirm} disabled={close.isPending} className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
          {close.isPending ? 'Closing…' : 'Close Engagement'}
        </button>
      </div>
    </DialogBackdrop>
  );
}

// ─── View Opinion Dialog ──────────────────────────────────────────────────────

function ViewOpinionDialog({ engagement, onClose }: { engagement: TaxAdvisoryEngagement; onClose: () => void }) {
  return (
    <DialogBackdrop>
      <DialogTitle>Tax Opinion — {engagement.engagementCode}</DialogTitle>
      <div className="space-y-2 mb-4">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Client: <strong className="text-foreground">{engagement.clientName}</strong></span>
          <span>Type: <strong className="text-foreground">{engagement.engagementType}</strong></span>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
        {engagement.opinion || '(No opinion text recorded)'}
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Close</button>
      </div>
    </DialogBackdrop>
  );
}

// ─── Row Actions ──────────────────────────────────────────────────────────────

type ActiveDialog =
  | { type: 'opinion'; engagement: TaxAdvisoryEngagement }
  | { type: 'view-opinion'; engagement: TaxAdvisoryEngagement }
  | { type: 'close'; engagement: TaxAdvisoryEngagement }
  | null;

function RowActions({ engagement, onAction }: { engagement: TaxAdvisoryEngagement; onAction: (d: ActiveDialog) => void }) {
  const [open, setOpen] = useState(false);
  const isClosed = engagement.status === 'CLOSED' || engagement.status === 'TERMINATED';
  const hasOpinion = Boolean(engagement.opinion);

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-muted" title="Actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 text-sm">
            {hasOpinion && (
              <button
                className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2"
                onClick={() => { setOpen(false); onAction({ type: 'view-opinion', engagement }); }}
              >
                <FileText className="w-3.5 h-3.5" /> View Opinion
              </button>
            )}
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'opinion', engagement }); }}
            >
              <FileText className="w-3.5 h-3.5" /> {hasOpinion ? 'Update Opinion' : 'Deliver Opinion'}
            </button>
            <div className="border-t border-border my-1" />
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted text-green-700 dark:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'close', engagement }); }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Close Engagement
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TaxAdvisoryPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('');

  const now = new Date();
  const fromYtd = `${now.getFullYear()}-01-01`;
  const toYtd = now.toISOString().slice(0, 10);

  const { data: engagements = [], isLoading } = useAllTaxEngagements();
  const { data: revenueYtd = 0 } = useTaxAdvisoryRevenue(fromYtd, toYtd);

  const filtered = useMemo(() => {
    let result = engagements;
    if (statusFilter) result = result.filter(e => e.status === statusFilter);
    if (typeFilter) result = result.filter(e => e.engagementType === typeFilter);
    return result;
  }, [engagements, statusFilter, typeFilter]);

  const activeCount = engagements.filter(e => !['CLOSED', 'TERMINATED'].includes(e.status)).length;
  const closedCount = engagements.filter(e => e.status === 'CLOSED').length;
  const totalFees = engagements.reduce((s, e) => s + (e.advisoryFee || 0), 0);

  const cols: ColumnDef<TaxAdvisoryEngagement, any>[] = [
    {
      accessorKey: 'engagementCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.engagementCode}</span>,
    },
    { accessorKey: 'engagementName', header: 'Engagement', size: 200 },
    { accessorKey: 'clientName', header: 'Client' },
    {
      accessorKey: 'engagementType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.engagementType} />,
    },
    {
      accessorKey: 'leadAdvisor',
      header: 'Lead Advisor',
      cell: ({ row }) => row.original.leadAdvisor || '—',
    },
    {
      accessorKey: 'taxAuthority',
      header: 'Tax Authority',
      cell: ({ row }) => row.original.taxAuthority || '—',
    },
    {
      accessorKey: 'advisoryFee',
      header: 'Advisory Fee',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.advisoryFee ? formatMoney(row.original.advisoryFee) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'riskRating',
      header: 'Risk',
      cell: ({ row }) => {
        const r = row.original.riskRating;
        if (!r) return '—';
        const cls = r === 'LOW' ? 'text-green-600' : r === 'MEDIUM' ? 'text-amber-600' : 'text-red-600';
        return <span className={`text-xs font-medium ${cls}`}>{r}</span>;
      },
    },
    {
      id: 'opinion',
      header: 'Opinion',
      cell: ({ row }) => (
        row.original.opinion
          ? <span className="text-xs text-green-600 font-medium">Delivered</span>
          : <span className="text-xs text-muted-foreground">Pending</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <RowActions engagement={row.original} onAction={setActiveDialog} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tax Advisory"
        subtitle="Corporate tax advisory engagements, opinions, and jurisdiction tracking"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Engagement
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Engagements" value={activeCount} format="number" icon={Briefcase} loading={isLoading} />
          <StatCard label="Total Advisory Fees" value={totalFees} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Revenue YTD" value={revenueYtd} format="money" compact icon={Globe} />
          <StatCard label="Closed Engagements" value={closedCount} format="number" icon={CheckCircle2} loading={isLoading} />
        </div>

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
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              className="rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-40"
              placeholder="Filter jurisdiction…"
              value={jurisdictionFilter}
              onChange={e => setJurisdictionFilter(e.target.value)}
            />
          </div>
          {(statusFilter || typeFilter || jurisdictionFilter) && (
            <button onClick={() => { setStatusFilter(''); setTypeFilter(''); setJurisdictionFilter(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
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
          exportFilename="tax-advisory-engagements"
          emptyMessage="No tax advisory engagements found"
        />
      </div>

      {/* Dialogs */}
      {showCreate && <CreateTaxDialog onClose={() => setShowCreate(false)} />}
      {activeDialog?.type === 'opinion' && (
        <DeliverOpinionDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog?.type === 'view-opinion' && (
        <ViewOpinionDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog?.type === 'close' && (
        <CloseTaxDialog engagement={activeDialog.engagement} onClose={() => setActiveDialog(null)} />
      )}
    </>
  );
}
