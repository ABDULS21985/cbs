import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, ChevronRight, DollarSign, Briefcase, CheckCircle, BarChart2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  useCorporateFinanceMandates,
  useCreateEngagement,
  useCloseEngagement,
  useDeliverDraft,
  useFinalizeDelivery,
  useRecordFeeInvoice,
  useRecordPayment,
} from '../hooks/useAdvisory';
import type {
  CorporateFinanceEngagement,
  CorporateFinanceType,
  CorporateFinanceStage,
} from '../api/advisoryApi';

const CF_TYPES: CorporateFinanceType[] = [
  'M_AND_A', 'IPO', 'RESTRUCTURING', 'BOND_ISSUANCE', 'PRIVATE_EQUITY',
];

const STAGES: CorporateFinanceStage[] = [
  'ORIGINATION', 'DUE_DILIGENCE', 'STRUCTURING', 'NEGOTIATION', 'EXECUTION', 'CLOSED',
];

const STAGE_IDX: Record<CorporateFinanceStage, number> = {
  ORIGINATION: 0, DUE_DILIGENCE: 1, STRUCTURING: 2,
  NEGOTIATION: 3, EXECUTION: 4, CLOSED: 5,
};

// ─── Stage progress steps ─────────────────────────────────────────────────────

function StageProgress({ stage }: { stage: CorporateFinanceStage }) {
  const current = STAGE_IDX[stage] ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {STAGES.map((s, i) => (
        <div
          key={s}
          title={s}
          className={`h-2 w-4 rounded-sm ${i <= current ? 'bg-primary' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

function RowActions({ row }: { row: CorporateFinanceEngagement }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<
    'draft' | 'invoice' | 'payment' | null
  >(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const deliverDraft = useDeliverDraft();
  const finalize = useFinalizeDelivery();
  const invoice = useRecordFeeInvoice();
  const payment = useRecordPayment();
  const close = useCloseEngagement();

  function handleAction(action: string) {
    setOpen(false);
    if (action === 'draft') setModal('draft');
    else if (action === 'finalize') finalize.mutate(row.code);
    else if (action === 'invoice') setModal('invoice');
    else if (action === 'payment') setModal('payment');
    else if (action === 'close') close.mutate(row.code);
  }

  function submitModal() {
    if (modal === 'draft') {
      deliverDraft.mutate({ code: row.code, payload: { reportRef: form.reportRef, draftUrl: form.draftUrl } });
    } else if (modal === 'invoice') {
      invoice.mutate({ code: row.code, payload: { invoiceAmount: Number(form.invoiceAmount), invoiceRef: form.invoiceRef } });
    } else if (modal === 'payment') {
      payment.mutate({ code: row.code, payload: { amount: Number(form.amount), paymentRef: form.paymentRef } });
    }
    setModal(null);
    setForm({});
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80"
        >
          Actions <ChevronRight className="w-3 h-3" />
        </button>
        {open && (
          <div className="absolute right-0 top-7 z-50 w-44 rounded-lg border bg-popover shadow-md py-1 text-xs">
            {(['draft', 'finalize', 'invoice', 'payment', 'close'] as const).map((a) => (
              <button
                key={a}
                onClick={() => handleAction(a)}
                className="w-full text-left px-3 py-2 hover:bg-muted capitalize"
              >
                {a === 'draft' ? 'Deliver Draft' : a === 'finalize' ? 'Finalize' : a === 'invoice' ? 'Invoice' : a === 'payment' ? 'Record Payment' : 'Close'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Simple modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-sm capitalize">
              {modal === 'draft' ? 'Deliver Draft' : modal === 'invoice' ? 'Record Invoice' : 'Record Payment'}
            </h3>
            {modal === 'draft' && (
              <>
                <label className="block text-xs font-medium">
                  Report Ref
                  <input
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.reportRef || ''}
                    onChange={(e) => setForm((f) => ({ ...f, reportRef: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Draft URL
                  <input
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.draftUrl || ''}
                    onChange={(e) => setForm((f) => ({ ...f, draftUrl: e.target.value }))}
                  />
                </label>
              </>
            )}
            {modal === 'invoice' && (
              <>
                <label className="block text-xs font-medium">
                  Invoice Amount
                  <input
                    type="number"
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.invoiceAmount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceAmount: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Invoice Ref
                  <input
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.invoiceRef || ''}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))}
                  />
                </label>
              </>
            )}
            {modal === 'payment' && (
              <>
                <label className="block text-xs font-medium">
                  Amount
                  <input
                    type="number"
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.amount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-medium">
                  Payment Ref
                  <input
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                    value={form.paymentRef || ''}
                    onChange={(e) => setForm((f) => ({ ...f, paymentRef: e.target.value }))}
                  />
                </label>
              </>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setModal(null); setForm({}); }}
                className="px-3 py-1.5 rounded border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitModal}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── New Mandate Dialog ───────────────────────────────────────────────────────

function NewMandateDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateEngagement();
  const [form, setForm] = useState({
    client: '',
    type: 'M_AND_A' as CorporateFinanceType,
    description: '',
    estimatedFee: '',
    currency: 'USD',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        client: form.client,
        type: form.type,
        description: form.description,
        estimatedFee: Number(form.estimatedFee),
        currency: form.currency,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="font-semibold">New Corporate Finance Mandate</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium">
            Client
            <input
              required
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.client}
              onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium">
            Type
            <select
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CorporateFinanceType }))}
            >
              {CF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium">
            Description
            <textarea
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">
              Estimated Fee
              <input
                type="number"
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.estimatedFee}
                onChange={(e) => setForm((f) => ({ ...f, estimatedFee: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Currency
              <input
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CorporateFinancePage() {
  const { data: mandates = [], isLoading } = useCorporateFinanceMandates();
  const [filterType, setFilterType] = useState<CorporateFinanceType | ''>('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showNew, setShowNew] = useState(false);

  const filtered = mandates.filter((m) => {
    if (filterType && m.type !== filterType) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });

  const statuses = [...new Set(mandates.map((m) => m.status))];

  const totalFees = mandates.reduce((s, m) => s + (m.estimatedFee || 0), 0);
  const closedThisYear = mandates.filter((m) => {
    if (m.stage !== 'CLOSED') return false;
    const year = new Date(m.updatedAt).getFullYear();
    return year === new Date().getFullYear();
  }).length;
  const avgDealSize = mandates.length > 0 ? totalFees / mandates.length : 0;

  const columns: ColumnDef<CorporateFinanceEngagement, any>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.code}</span>
      ),
    },
    { accessorKey: 'client', header: 'Client' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: 'estimatedFee',
      header: 'Est. Fee',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.estimatedFee, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ row }) => (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{row.original.stage.replace(/_/g, ' ')}</span>
          <StageProgress stage={row.original.stage} />
        </div>
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
      cell: ({ row }) => <RowActions row={row.original} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Corporate Finance"
        subtitle="Mandates: M&A, IPO, Restructuring, Bond Issuance, Private Equity"
      />
      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Mandates" value={mandates.length} format="number" icon={Briefcase} loading={isLoading} />
          <StatCard label="Total Est. Fees" value={totalFees} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Closed This Year" value={closedThisYear} format="number" icon={CheckCircle} loading={isLoading} />
          <StatCard label="Avg Deal Size" value={avgDealSize} format="money" compact icon={BarChart2} loading={isLoading} />
        </div>

        {/* Filters + New */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border px-3 py-1.5 text-sm bg-background"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as CorporateFinanceType | '')}
          >
            <option value="">All Types</option>
            {CF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="rounded-lg border px-3 py-1.5 text-sm bg-background"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="ml-auto">
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Mandate
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="corporate-finance-mandates"
          emptyMessage="No mandates match the selected filters"
        />
      </div>

      {showNew && <NewMandateDialog onClose={() => setShowNew(false)} />}
    </>
  );
}
