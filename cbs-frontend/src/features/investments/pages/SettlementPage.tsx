import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ArrowRightLeft, CheckCircle2, XCircle, Clock, AlertTriangle,
  Send, Link2, Plus, X, Loader2, FileDown, Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate, formatMoney as formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  settlementApi,
  type SettlementInstruction,
  type SettlementBatch,
  type SettlementDashboard,
} from '../api/settlementApi';

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MATCHED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  SETTLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PREPARING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PROCESSING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// ─── Instructions Tab ────────────────────────────────────────────────────────

function InstructionsTab() {
  const qc = useQueryClient();
  const { data: instructions = [], isLoading } = useQuery({
    queryKey: ['settlements', 'instructions'],
    queryFn: () => settlementApi.listInstructions(),
    staleTime: 15_000,
  });

  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [matchRefA, setMatchRefA] = useState('');
  const [matchRefB, setMatchRefB] = useState('');
  const [matching, setMatching] = useState(false);

  const filtered = useMemo(() => {
    if (!statusFilter) return instructions;
    return instructions.filter((i) => i.status === statusFilter);
  }, [instructions, statusFilter]);

  const submitMut = useMutation({
    mutationFn: (ref: string) => settlementApi.submitInstruction(ref),
    onSuccess: () => { toast.success('Instruction submitted'); qc.invalidateQueries({ queryKey: ['settlements'] }); },
    onError: () => toast.error('Failed to submit'),
  });

  const resultMut = useMutation({
    mutationFn: ({ ref, settled }: { ref: string; settled: boolean }) => settlementApi.recordResult(ref, settled),
    onSuccess: () => { toast.success('Result recorded'); qc.invalidateQueries({ queryKey: ['settlements'] }); },
    onError: () => toast.error('Failed to record result'),
  });

  const handleMatch = () => {
    if (!matchRefA || !matchRefB) return;
    setMatching(true);
    settlementApi.matchInstructions(matchRefA, matchRefB).then(() => {
      toast.success('Instructions matched successfully');
      qc.invalidateQueries({ queryKey: ['settlements'] });
      setShowMatch(false);
      setMatchRefA('');
      setMatchRefB('');
    }).catch(() => toast.error('Match failed — instructions may not be compatible'))
      .finally(() => setMatching(false));
  };

  const unmatchedRefs = useMemo(
    () => instructions.filter((i) => i.matchStatus === 'UNMATCHED').map((i) => i.instructionRef),
    [instructions],
  );

  const cols: ColumnDef<SettlementInstruction, unknown>[] = [
    { accessorKey: 'instructionRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.instructionRef}</span> },
    { accessorKey: 'instructionType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.instructionType} /> },
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => (
      <div><span className="text-sm font-medium">{row.original.instrumentCode}</span><br /><span className="text-xs text-muted-foreground">{row.original.isin}</span></div>
    )},
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => <span className="font-mono text-sm">{row.original.quantity?.toLocaleString()}</span> },
    { accessorKey: 'settlementAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatCurrency(row.original.settlementAmount, row.original.currency)}</span> },
    { accessorKey: 'counterpartyName', header: 'Counterparty', cell: ({ row }) => <span className="text-xs">{row.original.counterpartyName}</span> },
    { accessorKey: 'settlementCycle', header: 'Cycle', cell: ({ row }) => <span className="text-xs font-mono">{row.original.settlementCycle}</span> },
    { accessorKey: 'intendedSettlementDate', header: 'Settle Date', cell: ({ row }) => <span className="text-xs">{row.original.intendedSettlementDate ? formatDate(row.original.intendedSettlementDate) : '—'}</span> },
    { accessorKey: 'matchStatus', header: 'Match', cell: ({ row }) => (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold',
        row.original.matchStatus === 'MATCHED' ? 'bg-green-100 text-green-700' :
        row.original.matchStatus === 'MISMATCHED' ? 'bg-red-100 text-red-700' :
        'bg-gray-100 text-gray-600'
      )}>{row.original.matchStatus}</span>
    )},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLORS[row.original.status] ?? '')}>{row.original.status}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => {
      const si = row.original;
      return (
        <div className="flex gap-1">
          {si.status === 'CREATED' && (
            <button onClick={() => submitMut.mutate(si.instructionRef)} className="px-2 py-1 text-[10px] font-medium rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
              <Send className="w-3 h-3 inline mr-1" />Submit
            </button>
          )}
          {si.matchStatus === 'UNMATCHED' && (
            <button onClick={() => { setMatchRefA(si.instructionRef); setShowMatch(true); }} className="px-2 py-1 text-[10px] font-medium rounded bg-cyan-100 text-cyan-700 hover:bg-cyan-200">
              <Link2 className="w-3 h-3 inline mr-1" />Match
            </button>
          )}
          {si.status === 'SUBMITTED' && (
            <>
              <button onClick={() => resultMut.mutate({ ref: si.instructionRef, settled: true })} className="px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-700 hover:bg-green-200">Settle</button>
              <button onClick={() => resultMut.mutate({ ref: si.instructionRef, settled: false })} className="px-2 py-1 text-[10px] font-medium rounded bg-red-100 text-red-700 hover:bg-red-200">Fail</button>
            </>
          )}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {['', 'CREATED', 'SUBMITTED', 'MATCHED', 'SETTLED', 'FAILED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40')}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> New Instruction
        </button>
      </div>
      <DataTable columns={cols} data={filtered} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="settlement-instructions" pageSize={15} />
      {showCreate && <CreateInstructionDialog onClose={() => setShowCreate(false)} />}

      {/* Match Instructions Dialog */}
      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowMatch(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2"><Link2 className="w-5 h-5" /> Match Instructions</h2>
            <p className="text-xs text-muted-foreground mb-4">Select two unmatched settlement instructions to match</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Instruction A</label>
                <select value={matchRefA} onChange={(e) => setMatchRefA(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select...</option>
                  {unmatchedRefs.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Instruction B</label>
                <select value={matchRefB} onChange={(e) => setMatchRefB(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Select...</option>
                  {unmatchedRefs.filter((r) => r !== matchRefA).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-3">
                <button onClick={() => setShowMatch(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleMatch} disabled={matching || !matchRefA || !matchRefB}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Instruction Dialog ───────────────────────────────────────────────

function CreateInstructionDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    instructionType: 'BUY', instrumentCode: '', instrumentName: '', isin: '',
    quantity: 0, settlementAmount: 0, currency: 'NGN', settlementCycle: 'T2',
    counterpartyCode: '', counterpartyName: '', counterpartyBic: '',
    intendedSettlementDate: '', depositoryCode: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    settlementApi.createInstruction(form).then(() => {
      toast.success('Settlement instruction created');
      qc.invalidateQueries({ queryKey: ['settlements'] });
      onClose();
    }).catch(() => toast.error('Failed to create')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">New Settlement Instruction</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select className={fc} value={form.instructionType} onChange={(e) => setForm((f) => ({ ...f, instructionType: e.target.value }))}>
                {['BUY', 'SELL', 'DELIVER_FREE', 'RECEIVE_FREE', 'REPO', 'REVERSE_REPO', 'COLLATERAL_IN', 'COLLATERAL_OUT'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Settlement Cycle</label>
              <select className={fc} value={form.settlementCycle} onChange={(e) => setForm((f) => ({ ...f, settlementCycle: e.target.value }))}>
                {['T0', 'T1', 'T2', 'T3'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Instrument Code</label>
              <input className={fc} value={form.instrumentCode} onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">ISIN</label>
              <input className={fc} value={form.isin} onChange={(e) => setForm((f) => ({ ...f, isin: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Currency</label>
              <select className={fc} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Quantity</label>
              <input type="number" className={fc} value={form.quantity || ''} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Settlement Amount</label>
              <input type="number" step="0.01" className={fc} value={form.settlementAmount || ''} onChange={(e) => setForm((f) => ({ ...f, settlementAmount: Number(e.target.value) }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Counterparty Code</label>
              <input className={fc} value={form.counterpartyCode} onChange={(e) => setForm((f) => ({ ...f, counterpartyCode: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Counterparty BIC</label>
              <input className={fc} value={form.counterpartyBic} onChange={(e) => setForm((f) => ({ ...f, counterpartyBic: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Settlement Date</label>
              <input type="date" className={fc} value={form.intendedSettlementDate} onChange={(e) => setForm((f) => ({ ...f, intendedSettlementDate: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Depository</label>
              <input className={fc} value={form.depositoryCode} onChange={(e) => setForm((f) => ({ ...f, depositoryCode: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Batches Tab ─────────────────────────────────────────────────────────────

function BatchesTab() {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['settlements', 'batches'],
    queryFn: () => settlementApi.listBatches(),
    staleTime: 30_000,
  });

  const cols: ColumnDef<SettlementBatch, unknown>[] = [
    { accessorKey: 'batchRef', header: 'Batch Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.batchRef}</span> },
    { accessorKey: 'depositoryCode', header: 'Depository' },
    { accessorKey: 'settlementDate', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.settlementDate)}</span> },
    { accessorKey: 'totalInstructions', header: 'Total', cell: ({ row }) => <span className="font-mono">{row.original.totalInstructions}</span> },
    { accessorKey: 'settledCount', header: 'Settled', cell: ({ row }) => <span className="font-mono text-green-600">{row.original.settledCount}</span> },
    { accessorKey: 'failedCount', header: 'Failed', cell: ({ row }) => <span className={cn('font-mono', row.original.failedCount > 0 ? 'text-red-600' : '')}>{row.original.failedCount}</span> },
    { accessorKey: 'netAmount', header: 'Net', cell: ({ row }) => <span className="font-mono text-sm">{formatCurrency(row.original.netAmount, row.original.currency)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLORS[row.original.status] ?? '')}>{row.original.status}</span>
    )},
  ];

  return <DataTable columns={cols} data={batches} isLoading={isLoading} enableGlobalFilter pageSize={10} />;
}

// ─── Failed Tab ──────────────────────────────────────────────────────────────

function FailedTab() {
  const { data: failed = [], isLoading } = useQuery({
    queryKey: ['settlements', 'failed'],
    queryFn: () => settlementApi.getFailedInstructions(),
    staleTime: 15_000,
  });

  const cols: ColumnDef<SettlementInstruction, unknown>[] = [
    { accessorKey: 'instructionRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.instructionRef}</span> },
    { accessorKey: 'instrumentCode', header: 'Instrument' },
    { accessorKey: 'counterpartyName', header: 'Counterparty' },
    { accessorKey: 'settlementAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatCurrency(row.original.settlementAmount, row.original.currency)}</span> },
    { accessorKey: 'failReason', header: 'Reason', cell: ({ row }) => <span className="text-xs text-red-600">{row.original.failReason ?? '—'}</span> },
    { accessorKey: 'failedSince', header: 'Failed Since', cell: ({ row }) => <span className="text-xs">{row.original.failedSince ? formatDate(row.original.failedSince) : '—'}</span> },
    { accessorKey: 'penaltyAmount', header: 'Penalty', cell: ({ row }) => <span className="font-mono text-sm text-red-600">{row.original.penaltyAmount > 0 ? formatCurrency(row.original.penaltyAmount, row.original.currency) : '—'}</span> },
  ];

  return (
    <div className="space-y-3 p-1">
      {failed.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-400 font-medium">{failed.length} failed settlement{failed.length !== 1 ? 's' : ''} requiring attention</span>
        </div>
      )}
      <DataTable columns={cols} data={failed} isLoading={isLoading} enableGlobalFilter pageSize={10} emptyMessage="No failed settlements" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function SettlementPage() {
  useEffect(() => { document.title = 'Settlement Management | CBS'; }, []);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['settlements', 'dashboard'],
    queryFn: () => settlementApi.getDashboard(),
    staleTime: 15_000,
  });

  return (
    <>
      <PageHeader title="Settlement Management" subtitle="Securities settlement instructions, batches, and reconciliation" />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Instructions" value={dashboard?.totalInstructions ?? 0} format="number" icon={ArrowRightLeft} loading={dashLoading} />
          <StatCard label="Pending" value={dashboard?.pendingCount ?? 0} format="number" icon={Clock} loading={dashLoading} />
          <StatCard label="Matched" value={dashboard?.matchedCount ?? 0} format="number" icon={Link2} loading={dashLoading} />
          <StatCard label="Settled" value={dashboard?.settledCount ?? 0} format="number" icon={CheckCircle2} loading={dashLoading} />
          <StatCard label="Failed" value={dashboard?.failedCount ?? 0} format="number" icon={XCircle} loading={dashLoading} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'instructions', label: 'Instructions', content: <InstructionsTab /> },
              { id: 'batches', label: 'Batches', content: <BatchesTab /> },
              { id: 'failed', label: 'Failed', content: <FailedTab /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
