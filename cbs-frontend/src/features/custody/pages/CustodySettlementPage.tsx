import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Plus, Send, Link2, CheckCircle, XCircle, Building2, Layers, AlertTriangle } from 'lucide-react';
import {
  useSettlementDashboard,
  useFailedSettlements,
  useCreateSettlementInstruction,
  useSubmitSettlement,
  useRecordSettlementResult,
} from '../hooks/useCustody';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { custodyApi } from '../api/custodyApi';
import type { SettlementInstruction, CustodyAccount } from '../api/custodyApi';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';

const DEMO_CUSTOMER_ID = 'CUST-000001';

// ---- New Instruction Form -------------------------------------------------------

interface NewInstructionFormProps {
  onClose: () => void;
}

function NewInstructionForm({ onClose }: NewInstructionFormProps) {
  const [form, setForm] = useState({
    from: '',
    to: '',
    amount: '',
    currency: 'NGN',
    settlementDate: new Date().toISOString().split('T')[0],
    instrumentCode: '',
  });
  const create = useCreateSettlementInstruction();
  const queryClient = useQueryClient();

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    create.mutate(
      {
        from: form.from,
        to: form.to,
        amount: parseFloat(form.amount),
        currency: form.currency,
        settlementDate: form.settlementDate,
        instrumentCode: form.instrumentCode,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['settlements', 'dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['settlements', 'instructions'] });
          onClose();
        },
      },
    );
  };

  const fields: { label: string; key: string; type?: string; placeholder?: string }[] = [
    { label: 'From Account', key: 'from', placeholder: 'ACC-001' },
    { label: 'To Account', key: 'to', placeholder: 'ACC-002' },
    { label: 'Amount', key: 'amount', type: 'number', placeholder: '0.00' },
    { label: 'Instrument Code', key: 'instrumentCode', placeholder: 'BOND-001' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-base">New Settlement Instruction</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground block mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full h-8 px-2.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              className="w-full h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {['NGN', 'USD', 'EUR', 'GBP'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Settlement Date</label>
            <input
              type="date"
              value={form.settlementDate}
              onChange={(e) => set('settlementDate', e.target.value)}
              className="w-full h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending || !form.from || !form.to || !form.amount}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create Instruction'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Instructions Table ---------------------------------------------------------

function InstructionsTab() {
  const [showForm, setShowForm] = useState(false);
  const { data: instructions = [], isLoading } = useQuery({
    queryKey: ['settlements', 'instructions', 'all'],
    queryFn: () => custodyApi.getSettlementDashboard().then(() => [] as SettlementInstruction[]),
    staleTime: 30_000,
  });

  const submit = useSubmitSettlement();
  const recordResult = useRecordSettlementResult();

  const cols: ColumnDef<SettlementInstruction, any>[] = [
    {
      accessorKey: 'ref',
      header: 'Ref',
      cell: ({ row }) => (
        <span
          className={cn(
            'font-mono text-xs',
            row.original.status === 'FAILED' ? 'text-red-600 font-semibold' : 'text-primary',
          )}
        >
          {row.original.ref}
        </span>
      ),
    },
    {
      accessorKey: 'fromAccount',
      header: 'From',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.fromAccount}</span>,
    },
    {
      accessorKey: 'toAccount',
      header: 'To',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.toAccount}</span>,
    },
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
      accessorKey: 'instrumentCode',
      header: 'Instrument',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.instrumentCode}</span>
      ),
    },
    {
      accessorKey: 'settlementDate',
      header: 'Settle Date',
      cell: ({ row }) => (
        <span className="text-xs">{formatDate(row.original.settlementDate)}</span>
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
        const s = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {s.status === 'MATCHED' && (
              <button
                onClick={() => submit.mutate(s.ref)}
                disabled={submit.isPending}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-2.5 h-2.5" /> Submit
              </button>
            )}
            {s.status === 'PENDING' && (
              <button
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              >
                <Link2 className="w-2.5 h-2.5" /> Match
              </button>
            )}
            {s.status === 'SUBMITTED' && (
              <>
                <button
                  onClick={() =>
                    recordResult.mutate({ ref: s.ref, status: 'SETTLED' })
                  }
                  disabled={recordResult.isPending}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-2.5 h-2.5" /> Settled
                </button>
                <button
                  onClick={() =>
                    recordResult.mutate({ ref: s.ref, status: 'FAILED' })
                  }
                  disabled={recordResult.isPending}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="w-2.5 h-2.5" /> Failed
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Instruction
        </button>
      </div>

      <DataTable
        columns={cols}
        data={instructions}
        isLoading={isLoading}
        enableGlobalFilter
      />

      {showForm && <NewInstructionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ---- Custody Accounts Tab -------------------------------------------------------

function CustodyAccountsTab() {
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['custody', 'accounts', 'customer', DEMO_CUSTOMER_ID],
    queryFn: () => custodyApi.getCustomerCustodyAccounts(DEMO_CUSTOMER_ID),
  });

  const cols: ColumnDef<CustodyAccount, any>[] = [
    {
      accessorKey: 'code',
      header: 'Account Code',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: 'custodyType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.custodyType} />,
    },
    {
      accessorKey: 'custodian',
      header: 'Custodian',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          {row.original.custodian}
        </span>
      ),
    },
    { accessorKey: 'denomination', header: 'Denomination' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'openedAt',
      header: 'Opened',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.openedAt)}</span>
      ),
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={cols}
        data={accounts}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No custody accounts found for this customer."
      />
    </div>
  );
}

// ---- Failed Settlements Tab -----------------------------------------------------

function FailedSettlementsTab() {
  const { data: failed = [], isLoading } = useFailedSettlements();
  const recordResult = useRecordSettlementResult();

  const cols: ColumnDef<SettlementInstruction, any>[] = [
    {
      accessorKey: 'ref',
      header: 'Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-red-600">{row.original.ref}</span>
      ),
    },
    {
      accessorKey: 'fromAccount',
      header: 'From',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.fromAccount}</span>,
    },
    {
      accessorKey: 'toAccount',
      header: 'To',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.toAccount}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-red-600">
          {formatMoney(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'instrumentCode',
      header: 'Instrument',
    },
    {
      accessorKey: 'failureReason',
      header: 'Failure Reason',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.failureReason || '--'}
        </span>
      ),
    },
    {
      accessorKey: 'settlementDate',
      header: 'Settle Date',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.settlementDate)}</span>,
    },
    {
      id: 'actions',
      header: 'Retry',
      cell: ({ row }) => (
        <button
          onClick={() =>
            recordResult.mutate({ ref: row.original.ref, status: 'SETTLED' })
          }
          disabled={recordResult.isPending}
          className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="w-2.5 h-2.5" /> Mark Settled
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {failed.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{failed.length} failed settlement{failed.length !== 1 ? 's' : ''} require attention</span>
        </div>
      )}
      <DataTable
        columns={cols}
        data={failed}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No failed settlements."
      />
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function CustodySettlementPage() {
  const { data: dash, isLoading: dashLoading } = useSettlementDashboard();
  const { data: failed = [] } = useFailedSettlements();

  return (
    <>
      <PageHeader
        title="Custody & Settlement"
        subtitle="Settlement instruction lifecycle, custody accounts, and fail management"
      />
      <div className="page-container space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Instructions Today"
            value={dash?.totalToday ?? 0}
            format="number"
            icon={Layers}
            loading={dashLoading}
          />
          <StatCard
            label="Pending Match"
            value={dash?.pending ?? 0}
            format="number"
            icon={Link2}
            loading={dashLoading}
          />
          <StatCard
            label="Failed"
            value={dash?.failed ?? failed.length}
            format="number"
            icon={XCircle}
            loading={dashLoading}
          />
          <StatCard
            label="Settled %"
            value={dash?.settledPercent ?? 0}
            format="percent"
            icon={CheckCircle}
            loading={dashLoading}
          />
        </div>

        {/* Main tabs */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'instructions',
              label: 'Instructions',
              badge: dash?.pending || undefined,
              content: <InstructionsTab />,
            },
            {
              id: 'custody-accounts',
              label: 'Custody Accounts',
              content: <CustodyAccountsTab />,
            },
            {
              id: 'failed',
              label: 'Failed Settlements',
              badge: failed.length || undefined,
              content: <FailedSettlementsTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
