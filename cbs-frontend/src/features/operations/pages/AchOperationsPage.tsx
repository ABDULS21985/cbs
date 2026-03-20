import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Layers, Clock, RotateCcw, DollarSign, Plus, Send,
  ArrowLeftRight, Users, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { apiGet, apiPost } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AchBatch {
  id: number;
  batchId: string;
  achOperator: string;
  batchType: 'CREDIT' | 'DEBIT';
  originatorId: string;
  originatorName: string;
  originatorAccountId: string;
  currency: string;
  totalTransactions: number;
  totalAmount: number;
  effectiveDate: string;
  settlementDate: string;
  status: string;
  rejections: number;
  returns: number;
  createdAt: string;
}

interface AchReturn {
  id: number;
  batchId: string;
  itemReference: string;
  originatorName: string;
  beneficiaryName: string;
  amount: number;
  currency: string;
  returnReason: string;
  returnDate: string;
  status: string;
}

interface AchSettlement {
  id: number;
  operator: string;
  settlementDate: string;
  currency: string;
  creditVolume: number;
  creditAmount: number;
  debitVolume: number;
  debitAmount: number;
  netAmount: number;
  status: string;
}

interface AchOperator {
  id: number;
  code: string;
  name: string;
  routingNumber: string;
  status: string;
  batchesToday: number;
  lastActivity: string;
}

interface NewBatchForm {
  achOperator: string;
  batchType: 'CREDIT' | 'DEBIT';
  originatorId: string;
  originatorName: string;
  originatorAccountId: string;
  currency: string;
  effectiveDate: string;
  totalTransactions: string;
  totalAmount: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const achApi = {
  getBatches: () => apiGet<AchBatch[]>('/api/v1/ach/batches'),
  getReturns: () => apiGet<AchReturn[]>('/api/v1/ach/returns'),
  getSettlements: () => apiGet<AchSettlement[]>('/api/v1/ach/settlements'),
  getOperators: () => apiGet<AchOperator[]>('/api/v1/ach/operators'),
  createBatch: (data: Partial<AchBatch>) => apiPost<AchBatch>('/api/v1/ach/batches', data),
  submitBatch: (batchId: string) => apiPost<AchBatch>(`/api/v1/ach/batches/${batchId}/submit`),
};

const DEFAULT_FORM: NewBatchForm = {
  achOperator: '',
  batchType: 'CREDIT',
  originatorId: '',
  originatorName: '',
  originatorAccountId: '',
  currency: 'NGN',
  effectiveDate: '',
  totalTransactions: '',
  totalAmount: '',
};

// ─── Batches Tab ─────────────────────────────────────────────────────────────

function BatchesTab() {
  const qc = useQueryClient();
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['ach', 'batches'],
    queryFn: achApi.getBatches,
    staleTime: 15_000,
  });

  const submitMutation = useMutation({
    mutationFn: achApi.submitBatch,
    onSuccess: () => {
      toast.success('Batch submitted successfully');
      qc.invalidateQueries({ queryKey: ['ach'] });
    },
    onError: () => toast.error('Failed to submit batch'),
  });

  const columns = useMemo<ColumnDef<AchBatch, unknown>[]>(
    () => [
      {
        accessorKey: 'batchId',
        header: 'Batch ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.batchId}</span>
        ),
      },
      { accessorKey: 'achOperator', header: 'Operator' },
      {
        accessorKey: 'batchType',
        header: 'Type',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              row.original.batchType === 'CREDIT'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          >
            {row.original.batchType}
          </span>
        ),
      },
      { accessorKey: 'originatorName', header: 'Originator' },
      { accessorKey: 'currency', header: 'Currency' },
      {
        accessorKey: 'totalTransactions',
        header: 'Transactions',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.totalTransactions.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatMoney(row.original.totalAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'effectiveDate',
        header: 'Effective Date',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.effectiveDate)}</span>,
      },
      {
        accessorKey: 'settlementDate',
        header: 'Settlement Date',
        cell: ({ row }) =>
          row.original.settlementDate ? (
            <span className="text-sm">{formatDate(row.original.settlementDate)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'rejections',
        header: 'Rejections',
        cell: ({ row }) => (
          <span className={`text-sm ${row.original.rejections > 0 ? 'text-red-600 font-medium' : ''}`}>
            {row.original.rejections}
          </span>
        ),
      },
      {
        accessorKey: 'returns',
        header: 'Returns',
        cell: ({ row }) => (
          <span className={`text-sm ${row.original.returns > 0 ? 'text-red-600 font-medium' : ''}`}>
            {row.original.returns}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          if (row.original.status !== 'CREATED') return null;
          return (
            <button
              onClick={() => submitMutation.mutate(row.original.batchId)}
              disabled={submitMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
          );
        },
      },
    ],
    [submitMutation],
  );

  return (
    <div className="p-6">
      <DataTable columns={columns} data={batches} isLoading={isLoading} enableGlobalFilter pageSize={15} />
    </div>
  );
}

// ─── Returns Tab ─────────────────────────────────────────────────────────────

function ReturnsTab() {
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['ach', 'returns'],
    queryFn: achApi.getReturns,
    staleTime: 15_000,
  });

  const columns = useMemo<ColumnDef<AchReturn, unknown>[]>(
    () => [
      { accessorKey: 'batchId', header: 'Batch' },
      {
        accessorKey: 'itemReference',
        header: 'Item Ref',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.itemReference}</span>
        ),
      },
      { accessorKey: 'originatorName', header: 'Originator' },
      { accessorKey: 'beneficiaryName', header: 'Beneficiary' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatMoney(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      { accessorKey: 'returnReason', header: 'Return Reason' },
      {
        accessorKey: 'returnDate',
        header: 'Date',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.returnDate)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable columns={columns} data={returns} isLoading={isLoading} enableGlobalFilter pageSize={15} />
    </div>
  );
}

// ─── Settlement Tab ──────────────────────────────────────────────────────────

function SettlementTab() {
  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['ach', 'settlements'],
    queryFn: achApi.getSettlements,
    staleTime: 15_000,
  });

  const columns = useMemo<ColumnDef<AchSettlement, unknown>[]>(
    () => [
      { accessorKey: 'operator', header: 'Operator' },
      {
        accessorKey: 'settlementDate',
        header: 'Settlement Date',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.settlementDate)}</span>,
      },
      { accessorKey: 'currency', header: 'Currency' },
      {
        accessorKey: 'creditVolume',
        header: 'Credit Vol',
        cell: ({ row }) => <span className="text-sm">{row.original.creditVolume.toLocaleString()}</span>,
      },
      {
        accessorKey: 'creditAmount',
        header: 'Credit Amt',
        cell: ({ row }) => (
          <span className="text-sm text-green-600 font-medium">
            {formatMoney(row.original.creditAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'debitVolume',
        header: 'Debit Vol',
        cell: ({ row }) => <span className="text-sm">{row.original.debitVolume.toLocaleString()}</span>,
      },
      {
        accessorKey: 'debitAmount',
        header: 'Debit Amt',
        cell: ({ row }) => (
          <span className="text-sm text-red-600 font-medium">
            {formatMoney(row.original.debitAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'netAmount',
        header: 'Net Amount',
        cell: ({ row }) => (
          <span className="text-sm font-semibold">
            {formatMoney(row.original.netAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable columns={columns} data={settlements} isLoading={isLoading} enableGlobalFilter pageSize={15} />
    </div>
  );
}

// ─── Operators Tab ───────────────────────────────────────────────────────────

function OperatorsTab() {
  const { data: operators = [], isLoading } = useQuery({
    queryKey: ['ach', 'operators'],
    queryFn: achApi.getOperators,
    staleTime: 30_000,
  });

  const columns = useMemo<ColumnDef<AchOperator, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
      },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'routingNumber', header: 'Routing Number' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'batchesToday',
        header: 'Batches Today',
        cell: ({ row }) => <span className="text-sm">{row.original.batchesToday.toLocaleString()}</span>,
      },
      {
        accessorKey: 'lastActivity',
        header: 'Last Activity',
        cell: ({ row }) =>
          row.original.lastActivity ? (
            <span className="text-sm">{formatDateTime(row.original.lastActivity)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable columns={columns} data={operators} isLoading={isLoading} enableGlobalFilter pageSize={15} />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AchOperationsPage() {
  const qc = useQueryClient();
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [form, setForm] = useState<NewBatchForm>(DEFAULT_FORM);

  const { data: batches = [] } = useQuery({
    queryKey: ['ach', 'batches'],
    queryFn: achApi.getBatches,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: achApi.createBatch,
    onSuccess: () => {
      toast.success('ACH batch created successfully');
      qc.invalidateQueries({ queryKey: ['ach'] });
      setShowNewBatch(false);
      setForm(DEFAULT_FORM);
    },
    onError: () => toast.error('Failed to create ACH batch'),
  });

  const totalBatchesToday = batches.length;
  const pendingSettlement = batches.filter((b) => b.status === 'PENDING' || b.status === 'SUBMITTED').length;
  const totalReturns = batches.reduce((sum, b) => sum + b.returns, 0);
  const totalVolume = batches.reduce((sum, b) => sum + b.totalAmount, 0);

  const handleSubmit = () => {
    if (!form.achOperator || !form.originatorId || !form.effectiveDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate({
      achOperator: form.achOperator,
      batchType: form.batchType,
      originatorId: form.originatorId,
      originatorName: form.originatorName,
      originatorAccountId: form.originatorAccountId,
      currency: form.currency,
      effectiveDate: form.effectiveDate,
      totalTransactions: Number(form.totalTransactions) || 0,
      totalAmount: Number(form.totalAmount) || 0,
    } as Partial<AchBatch>);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="ACH Operations"
        subtitle="Automated Clearing House batch processing and settlement"
        actions={
          <button
            onClick={() => setShowNewBatch(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Batch
          </button>
        }
      />

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Batches Today" value={totalBatchesToday} format="number" icon={Layers} />
          <StatCard label="Pending Settlement" value={pendingSettlement} format="number" icon={Clock} />
          <StatCard label="Returns" value={totalReturns} format="number" icon={RotateCcw} trend={totalReturns > 0 ? 'down' : undefined} />
          <StatCard label="Total Volume" value={totalVolume} format="money" icon={DollarSign} compact />
        </div>
      </div>

      <TabsPage
        tabs={[
          { id: 'batches', label: 'Batches', icon: Layers, content: <BatchesTab /> },
          { id: 'returns', label: 'Returns', icon: RotateCcw, badge: totalReturns, content: <ReturnsTab /> },
          { id: 'settlement', label: 'Settlement', icon: ArrowLeftRight, content: <SettlementTab /> },
          { id: 'operators', label: 'Operators', icon: Users, content: <OperatorsTab /> },
        ]}
        defaultTab="batches"
      />

      {/* New Batch Dialog */}
      {showNewBatch && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNewBatch(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">New ACH Batch</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">ACH Operator *</label>
                  <input
                    type="text"
                    value={form.achOperator}
                    onChange={(e) => setForm((f) => ({ ...f, achOperator: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. NIBSS"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Batch Type *</label>
                  <select
                    value={form.batchType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, batchType: e.target.value as 'CREDIT' | 'DEBIT' }))
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="CREDIT">CREDIT</option>
                    <option value="DEBIT">DEBIT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Originator ID *</label>
                  <input
                    type="text"
                    value={form.originatorId}
                    onChange={(e) => setForm((f) => ({ ...f, originatorId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Originator Name</label>
                  <input
                    type="text"
                    value={form.originatorName}
                    onChange={(e) => setForm((f) => ({ ...f, originatorName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Originator Account</label>
                  <input
                    type="text"
                    value={form.originatorAccountId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, originatorAccountId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Effective Date *</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Total Transactions</label>
                  <input
                    type="number"
                    value={form.totalTransactions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, totalTransactions: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Total Amount</label>
                  <input
                    type="number"
                    value={form.totalAmount}
                    onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowNewBatch(false);
                    setForm(DEFAULT_FORM);
                  }}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Batch
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
