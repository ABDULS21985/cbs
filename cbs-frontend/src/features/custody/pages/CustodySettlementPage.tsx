import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage, DataTable } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
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

  const statusCounts = {
    PENDING: instructions.filter((i) => i.status === 'PENDING').length,
    MATCHED: instructions.filter((i) => i.status === 'MATCHED').length,
    SUBMITTED: instructions.filter((i) => i.status === 'SUBMITTED').length,
    SETTLED: instructions.filter((i) => i.status === 'SETTLED').length,
    FAILED: instructions.filter((i) => i.status === 'FAILED').length,
  };

  const funnelStages = [
    { label: 'Pending', count: statusCounts.PENDING, color: 'bg-amber-500' },
    { label: 'Matched', count: statusCounts.MATCHED, color: 'bg-blue-500' },
    { label: 'Submitted', count: statusCounts.SUBMITTED, color: 'bg-purple-500' },
    { label: 'Settled', count: statusCounts.SETTLED, color: 'bg-green-500' },
  ];
  const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Today" value={dashboard?.totalToday ?? 0} format="number" icon={ArrowRightLeft} />
        <StatCard label="Pending Match" value={statusCounts.PENDING} format="number" icon={Clock} />
        <StatCard label="Submitted" value={statusCounts.SUBMITTED} format="number" icon={Layers} />
        <StatCard label="Settled" value={statusCounts.SETTLED} format="number" icon={CheckCircle} />
        <StatCard label="Failed" value={statusCounts.FAILED} format="number" icon={XCircle} />
        <StatCard label="Settlement Rate" value={dashboard?.settledPercent != null ? `${dashboard.settledPercent.toFixed(1)}%` : '--'} icon={CheckCircle} />
      </div>

      {/* Funnel */}
      <div className="rounded-xl border bg-card p-5">
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

function InstructionsTab() {
  const { data: instructions = [], isLoading } = useSettlementInstructions();
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [matchTarget, setMatchTarget] = useState<string | null>(null);
  const [matchRef2, setMatchRef2] = useState('');
  const createInstruction = useCreateSettlementInstruction();
  const matchInstructions = useMatchInstructions();
  const submitSettlement = useSubmitSettlement();
  const recordResult = useRecordSettlementResult();

  const [newForm, setNewForm] = useState({ fromAccount: '', toAccount: '', amount: 0, currency: 'USD', settlementDate: '', instrumentCode: '' });

  const filtered = statusFilter ? instructions.filter((i) => i.status === statusFilter) : instructions;

  const handleCreate = () => {
    createInstruction.mutate(newForm, {
      onSuccess: () => { toast.success('Instruction created'); setShowNew(false); setNewForm({ fromAccount: '', toAccount: '', amount: 0, currency: 'USD', settlementDate: '', instrumentCode: '' }); },
      onError: () => toast.error('Failed to create'),
    });
  };

  const handleMatch = () => {
    if (!matchTarget || !matchRef2.trim()) return;
    matchInstructions.mutate({ ref1: matchTarget, ref2: matchRef2 }, {
      onSuccess: () => { toast.success('Instructions matched'); setMatchTarget(null); setMatchRef2(''); },
      onError: () => toast.error('Match failed'),
    });
  };

  const cols: ColumnDef<SettlementInstruction, unknown>[] = [
    { accessorKey: 'ref', header: 'Ref', cell: ({ row }) => <code className="text-xs font-mono">{row.original.ref}</code> },
    { accessorKey: 'fromAccount', header: 'From' },
    { accessorKey: 'toAccount', header: 'To' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
    { accessorKey: 'currency', header: 'CCY' },
    { accessorKey: 'instrumentCode', header: 'Instrument' },
    { accessorKey: 'settlementDate', header: 'Settle Date', cell: ({ row }) => formatDate(row.original.settlementDate) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'matchedWith', header: 'Matched', cell: ({ row }) => row.original.matchedWith ? <code className="text-[10px] font-mono">{row.original.matchedWith}</code> : '—' },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => {
        const i = row.original;
        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {i.status === 'PENDING' && (
              <button onClick={() => setMatchTarget(i.ref)} className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">Match</button>
            )}
            {i.status === 'MATCHED' && (
              <button onClick={() => submitSettlement.mutate(i.ref, { onSuccess: () => toast.success('Submitted'), onError: () => toast.error('Failed') })}
                className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200">Submit</button>
            )}
            {i.status === 'SUBMITTED' && (
              <>
                <button onClick={() => recordResult.mutate({ ref: i.ref, settled: true }, { onSuccess: () => toast.success('Settled'), onError: () => toast.error('Failed') })}
                  className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200">Settle</button>
                <button onClick={() => recordResult.mutate({ ref: i.ref, settled: false, reason: 'Manual fail' }, { onSuccess: () => toast.success('Marked failed'), onError: () => toast.error('Failed') })}
                  className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">Fail</button>
              </>
            )}
            {i.status === 'FAILED' && (
              <button onClick={() => submitSettlement.mutate(i.ref, { onSuccess: () => toast.success('Retried'), onError: () => toast.error('Failed') })}
                className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200">Retry</button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'PENDING', 'MATCHED', 'SUBMITTED', 'SETTLED', 'FAILED'].map((s) => (
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
              <div><label className="text-xs text-muted-foreground">From Account</label><input value={newForm.fromAccount} onChange={(e) => setNewForm((f) => ({ ...f, fromAccount: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">To Account</label><input value={newForm.toAccount} onChange={(e) => setNewForm((f) => ({ ...f, toAccount: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Amount</label><input type="number" value={newForm.amount || ''} onChange={(e) => setNewForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Currency</label><select value={newForm.currency} onChange={(e) => setNewForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">{['USD', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Settlement Date</label><input type="date" value={newForm.settlementDate} onChange={(e) => setNewForm((f) => ({ ...f, settlementDate: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
              <div><label className="text-xs text-muted-foreground">Instrument Code</label><input value={newForm.instrumentCode} onChange={(e) => setNewForm((f) => ({ ...f, instrumentCode: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={createInstruction.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Create</button>
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
  const { data: instructions = [] } = useSettlementInstructions();
  const createBatch = useCreateSettlementBatch();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);

  const matchedInstructions = instructions.filter((i) => i.status === 'MATCHED');

  const handleCreate = () => {
    createBatch.mutate(selectedRefs, {
      onSuccess: () => { toast.success('Batch created'); setShowCreate(false); setSelectedRefs([]); },
      onError: () => toast.error('Failed'),
    });
  };

  const batchCols: ColumnDef<SettlementBatch, unknown>[] = [
    { accessorKey: 'batchRef', header: 'Batch Ref', cell: ({ row }) => <code className="text-xs font-mono">{row.original.batchRef}</code> },
    { accessorKey: 'instructions', header: 'Instructions', cell: ({ row }) => row.original.instructions.length },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'settledCount', header: 'Settled' },
    { accessorKey: 'failedCount', header: 'Failed' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'progress', header: 'Progress',
      cell: ({ row }) => {
        const total = row.original.instructions.length;
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
        <button onClick={() => setShowCreate(true)} disabled={matchedInstructions.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Layers className="w-4 h-4" /> Create Batch
        </button>
      </div>

      <DataTable columns={batchCols} data={batches} isLoading={isLoading} emptyMessage="No settlement batches" />

      {showCreate && (
        <Modal title="Create Settlement Batch" onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select matched instructions to include in the batch:</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {matchedInstructions.map((i) => (
                <label key={i.ref} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={selectedRefs.includes(i.ref)} onChange={(e) => {
                    setSelectedRefs((prev) => e.target.checked ? [...prev, i.ref] : prev.filter((r) => r !== i.ref));
                  }} className="rounded" />
                  <code className="text-xs font-mono">{i.ref}</code>
                  <span className="text-xs text-muted-foreground">{formatMoney(i.amount, i.currency)}</span>
                </label>
              ))}
            </div>
            {matchedInstructions.length === 0 && <p className="text-xs text-muted-foreground">No matched instructions available.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleCreate} disabled={createBatch.isPending || selectedRefs.length === 0}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Create Batch ({selectedRefs.length})
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
  const [form, setForm] = useState({ customerId: '', custodyType: 'SECURITIES' as const, denomination: 'USD', custodian: '' });

  const activeCount = accounts.filter((a) => a.status === 'ACTIVE').length;
  const totalAum = accounts.reduce((s, a) => s + (a.holdings?.reduce((hs, h) => hs + (h.marketValue ?? 0), 0) ?? 0), 0);

  const handleOpen = () => {
    createAccount.mutate(form, {
      onSuccess: () => { toast.success('Account opened'); setShowOpen(false); },
      onError: () => toast.error('Failed to open account'),
    });
  };

  const cols: ColumnDef<CustodyAccount, unknown>[] = [
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => <code className="text-xs font-mono">{row.original.code}</code> },
    { accessorKey: 'customerId', header: 'Customer' },
    { accessorKey: 'custodyType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.custodyType} /> },
    { accessorKey: 'custodian', header: 'Custodian' },
    { accessorKey: 'denomination', header: 'CCY' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'holdings', header: 'Holdings', cell: ({ row }) => row.original.holdings?.length ?? 0 },
    { id: 'aum', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.holdings?.reduce((s, h) => s + (h.marketValue ?? 0), 0) ?? 0, row.original.denomination)}</span> },
    { accessorKey: 'openedAt', header: 'Opened', cell: ({ row }) => formatDate(row.original.openedAt) },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Accounts" value={accounts.length} format="number" icon={Wallet} />
          <StatCard label="Active" value={activeCount} format="number" icon={CheckCircle} />
          <StatCard label="Total AUM" value={formatMoney(totalAum, 'USD')} icon={Wallet} />
        </div>
        <button onClick={() => setShowOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Open Account
        </button>
      </div>

      <DataTable columns={cols} data={accounts} isLoading={isLoading} enableGlobalFilter emptyMessage="No custody accounts" />

      {showOpen && (
        <Modal title="Open Custody Account" onClose={() => setShowOpen(false)}>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Customer ID</label><input value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="CUST-000001" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Custody Type</label><select value={form.custodyType} onChange={(e) => setForm((f) => ({ ...f, custodyType: e.target.value as any }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                <option value="SECURITIES">Securities</option><option value="DERIVATIVES">Derivatives</option><option value="MIXED">Mixed</option>
              </select></div>
              <div><label className="text-xs text-muted-foreground">Denomination</label><select value={form.denomination} onChange={(e) => setForm((f) => ({ ...f, denomination: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
                {['USD', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Custodian</label><input value={form.custodian} onChange={(e) => setForm((f) => ({ ...f, custodian: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Bank of New York Mellon" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowOpen(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={handleOpen} disabled={createAccount.isPending || !form.customerId || !form.custodian}
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
