import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage, DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowRightLeft, CheckCircle, XCircle, Clock, AlertTriangle, Plus, X, RefreshCw, Layers, Wallet } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { SettlementInstruction, SettlementBatch, CustodyAccount } from '../api/custodyApi';
import {
  useSettlementDashboard,
  useSettlementInstructions,
  useFailedSettlements,
  useSettlementBatches,
  useAllCustodyAccounts,
  useCreateSettlementInstruction,
  useMatchInstructions,
  useSubmitSettlement,
  useRecordSettlementResult,
  useCreateSettlementBatch,
  useCreateCustodyAccount,
} from '../hooks/useCustody';

// ── Modals ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data: dashboard } = useSettlementDashboard();
  const { data: instructions = [] } = useSettlementInstructions();
  const { data: failed = [] } = useFailedSettlements();

  // Backend returns totalPending / totalSettled / totalFailed only
  const totalAll = (dashboard?.totalPending ?? 0) + (dashboard?.totalSettled ?? 0) + (dashboard?.totalFailed ?? 0);
  const settledPct = totalAll > 0 ? ((dashboard?.totalSettled ?? 0) / totalAll) * 100 : 0;

  const statusCounts = {
    CREATED: instructions.filter((i) => i.status === 'CREATED').length,
    MATCHED: instructions.filter((i) => i.status === 'MATCHED').length,
    SETTLING: instructions.filter((i) => i.status === 'SETTLING').length,
    SETTLED: instructions.filter((i) => i.status === 'SETTLED').length,
    FAILED: instructions.filter((i) => i.status === 'FAILED').length,
  };

  const funnelStages = [
    { label: 'Created', count: statusCounts.CREATED, color: 'bg-amber-500' },
    { label: 'Matched', count: statusCounts.MATCHED, color: 'bg-blue-500' },
    { label: 'Settling', count: statusCounts.SETTLING, color: 'bg-purple-500' },
    { label: 'Settled', count: statusCounts.SETTLED, color: 'bg-green-500' },
  ];
  const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={totalAll} format="number" icon={ArrowRightLeft} />
        <StatCard label="Pending Match" value={statusCounts.CREATED} format="number" icon={Clock} />
        <StatCard label="Settling" value={statusCounts.SETTLING} format="number" icon={Layers} />
        <StatCard label="Settled" value={dashboard?.totalSettled ?? 0} format="number" icon={CheckCircle} />
        <StatCard label="Failed" value={dashboard?.totalFailed ?? 0} format="number" icon={XCircle} />
        <StatCard label="Settlement Rate" value={`${settledPct.toFixed(1)}%`} icon={CheckCircle} />
      </div>

      {/* Funnel */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-4">Settlement Flow</h3>
        <div className="space-y-3">
          {funnelStages.map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-20 text-right">{stage.label}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
                  <div className={cn('h-full rounded flex items-center px-2', stage.color)} style={{ width: `${Math.max(5, (stage.count / maxCount) * 100)}%` }}>
                    <span className="text-xs font-bold text-white">{stage.count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {failed.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">{failed.length} settlement{failed.length !== 1 ? 's' : ''} failed and need attention</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Instructions Tab ─────────────────────────────────────────────────────────

const STATUS_FILTERS = ['', 'CREATED', 'MATCHED', 'SETTLING', 'SETTLED', 'FAILED', 'CANCELLED'] as const;

function InstructionsTab() {
  const { data: instructions = [], isLoading } = useSettlementInstructions();
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [matchTarget, setMatchTarget] = useState<string | null>(null); // instructionRef
  const [matchRef2, setMatchRef2] = useState('');
  const createInstruction = useCreateSettlementInstruction();
  const matchInstructions = useMatchInstructions();
  const submitSettlement = useSubmitSettlement();
  const recordResult = useRecordSettlementResult();

  const [newForm, setNewForm] = useState({
    custodyAccountId: 0,
    instructionType: 'DVP' as const,
    settlementAmount: 0,
    currency: 'USD',
    intendedSettlementDate: '',
    instrumentCode: '',
    counterpartyCode: '',
  });

  const filtered = statusFilter ? instructions.filter((i) => i.status === statusFilter) : instructions;

  const handleCreate = () => {
    createInstruction.mutate(newForm, {
      onSuccess: () => {
        toast.success('Instruction created');
        setShowNew(false);
        setNewForm({ custodyAccountId: 0, instructionType: 'DVP', settlementAmount: 0, currency: 'USD', intendedSettlementDate: '', instrumentCode: '', counterpartyCode: '' });
      },
      onError: () => toast.error('Failed to create'),
    });
  };

  const handleMatch = () => {
    if (!matchTarget || !matchRef2.trim()) return;
    matchInstructions.mutate({ refA: matchTarget, refB: matchRef2 }, {
      onSuccess: () => { toast.success('Instructions matched'); setMatchTarget(null); setMatchRef2(''); },
      onError: () => toast.error('Match failed'),
    });
  };

  const cols: ColumnDef<SettlementInstruction, unknown>[] = [
    { accessorKey: 'instructionRef', header: 'Ref', cell: ({ row }) => <code className="text-xs font-mono">{row.original.instructionRef}</code> },
    { accessorKey: 'custodyAccountId', header: 'Account' },
    { accessorKey: 'counterpartyName', header: 'Counterparty', cell: ({ row }) => row.original.counterpartyName ?? row.original.counterpartyCode ?? '—' },
    { accessorKey: 'settlementAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.settlementAmount ?? 0, row.original.currency ?? 'USD')}</span> },
    { accessorKey: 'currency', header: 'CCY' },
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => row.original.instrumentCode ?? '—' },
    { accessorKey: 'intendedSettlementDate', header: 'Settle Date', cell: ({ row }) => row.original.intendedSettlementDate ? formatDate(row.original.intendedSettlementDate) : '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const i = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {i.status === 'CREATED' && (
              <button onClick={() => setMatchTarget(i.instructionRef)} className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">Match</button>
            )}
            {i.status === 'MATCHED' && (
              <button onClick={() => submitSettlement.mutate(i.instructionRef, { onSuccess: () => toast.success('Submitted'), onError: () => toast.error('Failed') })}
                className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">Submit</button>
            )}
            {i.status === 'SETTLING' && (
              <>
                <button onClick={() => recordResult.mutate({ ref: i.instructionRef, settled: true }, { onSuccess: () => toast.success('Settled'), onError: () => toast.error('Failed') })}
                  className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200">Settle</button>
                <button onClick={() => recordResult.mutate({ ref: i.instructionRef, settled: false }, { onSuccess: () => toast.success('Marked failed'), onError: () => toast.error('Failed') })}
                  className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">Fail</button>
              </>
            )}
            {i.status === 'FAILED' && (
              <button onClick={() => submitSettlement.mutate(i.instructionRef, { onSuccess: () => toast.success('Retried'), onError: () => toast.error('Failed') })}
                className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retry</button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium', statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Instruction
        </button>
      </div>

      <DataTable columns={cols} data={filtered} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="settlement-instructions" emptyMessage="No settlement instructions" />

      {showNew && (
        <Modal title="New Settlement Instruction" onClose={() => setShowNew(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Custody Account ID</label><input type="number" value={newForm.custodyAccountId || ''} onChange={(e) => setNewForm((f) => ({ ...f, custodyAccountId: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Instruction Type</label>
                <select value={newForm.instructionType} onChange={(e) => setNewForm((f) => ({ ...f, instructionType: e.target.value as typeof f.instructionType }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                  {['DVP', 'FOP', 'RECEIVE_VS_PAYMENT', 'DELIVERY_VS_PAYMENT', 'RECEIVE_FREE', 'DELIVERY_FREE', 'INTERNAL_TRANSFER'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Settlement Amount</label><input type="number" value={newForm.settlementAmount || ''} onChange={(e) => setNewForm((f) => ({ ...f, settlementAmount: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Currency</label><select value={newForm.currency} onChange={(e) => setNewForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">{['USD', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Settlement Date</label><input type="date" value={newForm.intendedSettlementDate} onChange={(e) => setNewForm((f) => ({ ...f, intendedSettlementDate: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Instrument Code</label><input value={newForm.instrumentCode} onChange={(e) => setNewForm((f) => ({ ...f, instrumentCode: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Counterparty Code</label><input value={newForm.counterpartyCode} onChange={(e) => setNewForm((f) => ({ ...f, counterpartyCode: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={createInstruction.isPending || !newForm.custodyAccountId || !newForm.intendedSettlementDate}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Create</button>
            </div>
          </div>
        </Modal>
      )}

      {matchTarget && (
        <Modal title={`Match ${matchTarget}`} onClose={() => setMatchTarget(null)}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter the counterparty instruction reference to match with.</p>
            <input value={matchRef2} onChange={(e) => setMatchRef2(e.target.value)} placeholder="Counterparty ref" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setMatchTarget(null)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleMatch} disabled={matchInstructions.isPending || !matchRef2.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Match</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Batches Tab ──────────────────────────────────────────────────────────────

function BatchesTab() {
  const { data: batches = [], isLoading } = useSettlementBatches();
  const createBatch = useCreateSettlementBatch();
  const [showCreate, setShowCreate] = useState(false);
  const [batchForm, setBatchForm] = useState({ depositoryCode: '', settlementDate: '', currency: 'USD', cutoffTime: '' });

  const handleCreate = () => {
    createBatch.mutate(batchForm, {
      onSuccess: () => { toast.success('Batch created'); setShowCreate(false); setBatchForm({ depositoryCode: '', settlementDate: '', currency: 'USD', cutoffTime: '' }); },
      onError: () => toast.error('Failed to create batch'),
    });
  };

  const batchCols: ColumnDef<SettlementBatch, unknown>[] = [
    { accessorKey: 'batchRef', header: 'Batch Ref', cell: ({ row }) => <code className="text-xs font-mono">{row.original.batchRef}</code> },
    { accessorKey: 'totalInstructions', header: 'Instructions' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'settledCount', header: 'Settled' },
    { accessorKey: 'failedCount', header: 'Failed' },
    { accessorKey: 'currency', header: 'CCY', cell: ({ row }) => row.original.currency ?? '—' },
    { accessorKey: 'settlementDate', header: 'Settle Date', cell: ({ row }) => row.original.settlementDate ? formatDate(row.original.settlementDate) : '—' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => row.original.createdAt ? formatDate(row.original.createdAt) : '—' },
    {
      id: 'progress', header: 'Progress',
      cell: ({ row }) => {
        const total = row.original.totalInstructions;
        const pct = total > 0 ? (row.original.settledCount / total) * 100 : 0;
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] tabular-nums">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Layers className="w-4 h-4" /> Create Batch
        </button>
      </div>

      <DataTable columns={batchCols} data={batches} isLoading={isLoading} emptyMessage="No settlement batches" />

      {showCreate && (
        <Modal title="Create Settlement Batch" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Settlement Date *</label><input type="date" value={batchForm.settlementDate} onChange={(e) => setBatchForm((f) => ({ ...f, settlementDate: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Currency</label><select value={batchForm.currency} onChange={(e) => setBatchForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">{['USD', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Depository Code</label><input value={batchForm.depositoryCode} onChange={(e) => setBatchForm((f) => ({ ...f, depositoryCode: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="DTCC" /></div>
              <div><label className="text-xs text-muted-foreground">Cutoff Time (HH:MM)</label><input type="time" value={batchForm.cutoffTime} onChange={(e) => setBatchForm((f) => ({ ...f, cutoffTime: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={createBatch.isPending || !batchForm.settlementDate}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Create Batch
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Accounts Tab ─────────────────────────────────────────────────────────────

function AccountsTab() {
  const { data: accounts = [], isLoading } = useAllCustodyAccounts();
  const createAccount = useCreateCustodyAccount();
  const [showOpen, setShowOpen] = useState(false);
  const [form, setForm] = useState({
    accountName: '',
    customerId: 0,
    accountType: 'GLOBAL_CUSTODY',
    currency: 'USD',
    subCustodian: '',
  });

  const activeCount = accounts.filter((a) => a.status === 'ACTIVE').length;

  const handleOpen = () => {
    createAccount.mutate(form, {
      onSuccess: () => { toast.success('Account opened'); setShowOpen(false); },
      onError: () => toast.error('Failed to open account'),
    });
  };

  const cols: ColumnDef<CustodyAccount, unknown>[] = [
    { accessorKey: 'accountCode', header: 'Code', cell: ({ row }) => <code className="text-xs font-mono">{row.original.accountCode}</code> },
    { accessorKey: 'accountName', header: 'Name' },
    { accessorKey: 'customerId', header: 'Customer' },
    { accessorKey: 'accountType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.accountType} /> },
    { accessorKey: 'subCustodian', header: 'Sub-Custodian', cell: ({ row }) => row.original.subCustodian ?? '—' },
    { accessorKey: 'currency', header: 'CCY' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'totalAssetsValue', header: 'Assets Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalAssetsValue ?? 0, row.original.currency)}</span> },
    { accessorKey: 'openedAt', header: 'Opened', cell: ({ row }) => row.original.openedAt ? formatDate(row.original.openedAt) : '—' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Accounts" value={accounts.length} format="number" icon={Wallet} />
          <StatCard label="Active" value={activeCount} format="number" icon={CheckCircle} />
        </div>
        <button onClick={() => setShowOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Open Account
        </button>
      </div>

      <DataTable columns={cols} data={accounts} isLoading={isLoading} enableGlobalFilter emptyMessage="No custody accounts" />

      {showOpen && (
        <Modal title="Open Custody Account" onClose={() => setShowOpen(false)}>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Account Name *</label><input value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="My Securities Custody Account" /></div>
            <div><label className="text-xs text-muted-foreground">Customer ID *</label><input type="number" value={form.customerId || ''} onChange={(e) => setForm((f) => ({ ...f, customerId: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Account Type</label><select value={form.accountType} onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                <option value="GLOBAL_CUSTODY">Global Custody</option>
                <option value="SUB_CUSTODY">Sub-Custody</option>
                <option value="SAFEKEEPING">Safekeeping</option>
                <option value="NOMINEE">Nominee</option>
                <option value="SETTLEMENT">Settlement</option>
                <option value="CASH_COLLATERAL">Cash Collateral</option>
              </select></div>
              <div><label className="text-xs text-muted-foreground">Currency</label><select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                {['USD', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Sub-Custodian</label><input value={form.subCustodian} onChange={(e) => setForm((f) => ({ ...f, subCustodian: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Bank of New York Mellon" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowOpen(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleOpen} disabled={createAccount.isPending || !form.accountName || !form.customerId}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Open Account</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function CustodySettlementPage() {
  useEffect(() => { document.title = 'Settlement Instructions | CBS'; }, []);

  return (
    <>
      <PageHeader title="Settlement Management" subtitle="Create, match, submit, and track settlement instructions" backTo="/custody" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'dashboard', label: 'Dashboard', content: <DashboardTab /> },
          { id: 'instructions', label: 'Instructions', content: <InstructionsTab /> },
          { id: 'batches', label: 'Batches', content: <BatchesTab /> },
          { id: 'accounts', label: 'Custody Accounts', content: <AccountsTab /> },
        ]} />
      </div>
    </>
  );
}
