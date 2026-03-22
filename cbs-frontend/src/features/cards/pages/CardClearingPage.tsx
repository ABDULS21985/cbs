import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { onMutationError } from '@/lib/errorHandler';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/hooks/usePermission';
import {
  FileCheck, ArrowLeftRight, Landmark, TrendingUp,
  RefreshCw, Download, Upload, Loader2, X, AlertTriangle,
  CheckCircle2, XCircle, Clock, Link2, Trash2, ArrowUpRight,
  Plus, FileText, ChevronLeft,
} from 'lucide-react';
import { cardClearingApi } from '../api/cardClearingApi';
import {
  useIngestClearingBatch,
  useSettleBatchByCode,
  useManualClearingBatch,
  useCreateSettlementPosition,
  useUpdatePositionStatus,
  useEscalatePosition,
} from '../hooks/useCardsExt';
import type { CardClearingBatch, CardSettlementPosition } from '../types/cardClearing';

// ── Backend-aligned constants ────────────────────────────────────────────────

const NETWORKS = ['VISA', 'MASTERCARD', 'VERVE'] as const;

const ALL_NETWORKS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'UNIONPAY', 'JCB', 'VERVE', 'INTERSWITCH'] as const;

/** DB CHECK: CLEARING, SETTLEMENT, CHARGEBACK, REPRESENTMENT, FEE, ADJUSTMENT */
const BATCH_TYPES = ['CLEARING', 'SETTLEMENT', 'CHARGEBACK', 'REPRESENTMENT', 'FEE', 'ADJUSTMENT'] as const;

/** DB CHECK: RECEIVED, VALIDATING, MATCHED, EXCEPTIONS, SETTLED, REJECTED, RECONCILED */
const BATCH_STATUSES = ['RECEIVED', 'VALIDATING', 'MATCHED', 'EXCEPTIONS', 'SETTLED', 'REJECTED', 'RECONCILED'] as const;

/** DB CHECK: PENDING, CALCULATED, CONFIRMED, SETTLED, DISPUTED */
const POSITION_STATUSES = ['PENDING', 'CALCULATED', 'CONFIRMED', 'SETTLED', 'DISPUTED'] as const;

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const;

// ── Sparkline (pure CSS mini-bars) ──────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length === 0) return null;
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <div className="flex items-end gap-px h-5">
      {values.map((v, i) => (
        <div key={i} className={cn('w-1.5 rounded-sm', color)}
          style={{ height: `${Math.max((Math.abs(v) / max) * 100, 8)}%`, opacity: 0.4 + (i / values.length) * 0.6 }} />
      ))}
    </div>
  );
}

// ── Skeleton matching table shape ───────────────────────────────────────────

function TableSkeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/30 border-b px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={cn('h-3 rounded bg-muted animate-pulse', i === 0 ? 'w-24' : 'w-20')} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-b last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={cn('h-3.5 rounded bg-muted/40 animate-pulse', j === 0 ? 'w-24' : 'w-20')} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-6 text-center">
      <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-700 dark:text-red-400 mb-3">{message}</p>
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
    </div>
  );
}

// ── CSV Export ───────────────────────────────────────────────────────────────

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── STATUS BADGES ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  // Batch statuses
  RECEIVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VALIDATING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  MATCHED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  EXCEPTIONS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  SETTLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RECONCILED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  // Position statuses
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CALCULATED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  CONFIRMED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DISPUTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/** Batch statuses eligible for settle action */
const SETTLEABLE_STATUSES = new Set(['RECEIVED', 'MATCHED']);

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300')}>
      {status}
    </span>
  );
}

// ── Form input class ────────────────────────────────────────────────────────

const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: SETTLEMENT POSITION
// ═══════════════════════════════════════════════════════════════════════════════

function SettlementPositionTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showCreatePosition, setShowCreatePosition] = useState(false);
  const isAdmin = useHasRole('CBS_ADMIN');
  const queryClient = useQueryClient();
  const createPosition = useCreateSettlementPosition();

  const [posForm, setPosForm] = useState({
    settlementDate: new Date().toISOString().slice(0, 10),
    network: 'VISA' as string,
    counterpartyBic: '',
    counterpartyName: '',
    currency: 'NGN',
    grossDebits: 0,
    grossCredits: 0,
    interchangeReceivable: 0,
    interchangePayable: 0,
    schemeFees: 0,
  });

  const [posErrors, setPosErrors] = useState<Record<string, string>>({});

  // Fetch positions for each network
  const queries = NETWORKS.map((network) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['card-clearing', 'positions', date, network],
      queryFn: () => cardClearingApi.positions(date, network),
      staleTime: 30_000,
    }),
  );

  // Fetch 7-day historical for sparklines
  const last7Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const historyQueries = NETWORKS.map((network) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['card-clearing', 'positions-history', network],
      queryFn: async () => {
        const results: number[] = [];
        for (const d of last7Days) {
          try {
            const pos = await cardClearingApi.positions(d, network);
            results.push(pos.reduce((s, p) => s + (p.netPosition ?? 0), 0));
          } catch {
            results.push(0);
          }
        }
        return results;
      },
      staleTime: 5 * 60_000,
    }),
  );

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);

  const settlementData = NETWORKS.map((network, i) => {
    const positions = queries[i].data ?? [];
    const outward = positions.reduce((s, p) => s + (p.grossDebits ?? 0), 0);
    const inward = positions.reduce((s, p) => s + (p.grossCredits ?? 0), 0);
    const interchange = positions.reduce((s, p) => s + (p.interchangeReceivable ?? 0), 0);
    const net = positions.reduce((s, p) => s + (p.netPosition ?? 0), 0);
    const trend = historyQueries[i].data ?? [];
    return { network, outward, inward, interchange, net, trend };
  });

  const totals = settlementData.reduce(
    (t, r) => ({ outward: t.outward + r.outward, inward: t.inward + r.inward, interchange: t.interchange + r.interchange, net: t.net + r.net }),
    { outward: 0, inward: 0, interchange: 0, net: 0 },
  );

  const handleRefresh = () => {
    NETWORKS.forEach(network => {
      queryClient.invalidateQueries({ queryKey: ['card-clearing', 'positions', date, network] });
    });
    queryClient.invalidateQueries({ queryKey: ['card-clearing', 'positions-history'] });
  };

  const handleExport = () => {
    exportCsv(`settlement-positions-${date}`,
      ['Network', 'Outward', 'Inward', 'Interchange', 'Net'],
      settlementData.map(r => [r.network, String(r.outward), String(r.inward), String(r.interchange), String(r.net)]),
    );
  };

  const validatePositionForm = () => {
    const errors: Record<string, string> = {};
    if (!posForm.settlementDate) errors.settlementDate = 'Required';
    if (!posForm.network) errors.network = 'Required';
    if (!posForm.currency) errors.currency = 'Required';
    if (posForm.grossDebits < 0) errors.grossDebits = 'Must be >= 0';
    if (posForm.grossCredits < 0) errors.grossCredits = 'Must be >= 0';
    setPosErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePosition = () => {
    if (!validatePositionForm()) return;
    createPosition.mutate(posForm, {
      onSuccess: () => {
        toast.success('Settlement position created successfully');
        setShowCreatePosition(false);
        setPosForm({ settlementDate: new Date().toISOString().slice(0, 10), network: 'VISA', counterpartyBic: '', counterpartyName: '', currency: 'NGN', grossDebits: 0, grossCredits: 0, interchangeReceivable: 0, interchangePayable: 0, schemeFees: 0 });
        setPosErrors({});
        handleRefresh();
      },
      onError: onMutationError,
    });
  };

  if (isError) return <div className="p-4"><ErrorRetry message="Failed to load settlement positions." onRetry={handleRefresh} /></div>;

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {isAdmin && (
            <button onClick={() => setShowCreatePosition(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Position
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? <TableSkeleton rows={3} cols={6} /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Network</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Outward</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Inward</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Interchange</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net Position</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-24">7-Day Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {settlementData.map(r => (
                <tr key={r.network} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.network}</td>
                  <td className="px-4 py-3 font-mono text-right">{formatMoney(r.outward)}</td>
                  <td className="px-4 py-3 font-mono text-right">{formatMoney(r.inward)}</td>
                  <td className="px-4 py-3 font-mono text-right text-green-600 dark:text-green-400">{formatMoney(r.interchange)}</td>
                  <td className={cn('px-4 py-3 font-mono text-right font-semibold', r.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {r.net >= 0 ? '+' : ''}{formatMoney(r.net)}
                  </td>
                  <td className="px-4 py-3 flex justify-center">
                    <Sparkline values={r.trend} color={r.net >= 0 ? 'bg-green-500' : 'bg-red-500'} />
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">TOTAL</td>
                <td className="px-4 py-2.5 font-mono text-right">{formatMoney(totals.outward)}</td>
                <td className="px-4 py-2.5 font-mono text-right">{formatMoney(totals.inward)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-green-600 dark:text-green-400">{formatMoney(totals.interchange)}</td>
                <td className={cn('px-4 py-2.5 font-mono text-right', totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  {totals.net >= 0 ? '+' : ''}{formatMoney(totals.net)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Create Settlement Position Modal */}
      {showCreatePosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreatePosition(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Create Settlement Position</h2>
              <button onClick={() => setShowCreatePosition(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Settlement Date *</label>
                  <input type="date" value={posForm.settlementDate} onChange={e => setPosForm(p => ({ ...p, settlementDate: e.target.value }))} className={cn(fc, posErrors.settlementDate && 'border-red-500')} />
                  {posErrors.settlementDate && <p className="text-xs text-red-500">{posErrors.settlementDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Network *</label>
                  <select value={posForm.network} onChange={e => setPosForm(p => ({ ...p, network: e.target.value }))} className={cn(fc, posErrors.network && 'border-red-500')}>
                    {ALL_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Currency *</label>
                  <select value={posForm.currency} onChange={e => setPosForm(p => ({ ...p, currency: e.target.value }))} className={cn(fc, posErrors.currency && 'border-red-500')}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Counterparty BIC</label>
                  <input value={posForm.counterpartyBic} onChange={e => setPosForm(p => ({ ...p, counterpartyBic: e.target.value }))} placeholder="e.g. GTBINGLA" className={fc} maxLength={11} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Counterparty Name</label>
                <input value={posForm.counterpartyName} onChange={e => setPosForm(p => ({ ...p, counterpartyName: e.target.value }))} placeholder="e.g. Guaranty Trust Bank" className={fc} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Gross Debits</label>
                  <input type="number" step="0.01" min="0" value={posForm.grossDebits} onChange={e => setPosForm(p => ({ ...p, grossDebits: Number(e.target.value) }))} className={cn(fc, 'font-mono', posErrors.grossDebits && 'border-red-500')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Gross Credits</label>
                  <input type="number" step="0.01" min="0" value={posForm.grossCredits} onChange={e => setPosForm(p => ({ ...p, grossCredits: Number(e.target.value) }))} className={cn(fc, 'font-mono', posErrors.grossCredits && 'border-red-500')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Interchange Receivable</label>
                  <input type="number" step="0.01" min="0" value={posForm.interchangeReceivable} onChange={e => setPosForm(p => ({ ...p, interchangeReceivable: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Interchange Payable</label>
                  <input type="number" step="0.01" min="0" value={posForm.interchangePayable} onChange={e => setPosForm(p => ({ ...p, interchangePayable: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Scheme Fees</label>
                <input type="number" step="0.01" min="0" value={posForm.schemeFees} onChange={e => setPosForm(p => ({ ...p, schemeFees: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-medium">Net Position (auto-calculated by backend):</span>{' '}
                <span className="font-mono">{formatMoney(posForm.grossCredits - posForm.grossDebits + posForm.interchangeReceivable - posForm.interchangePayable - posForm.schemeFees)}</span>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setShowCreatePosition(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreatePosition} disabled={createPosition.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {createPosition.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: CLEARING BATCHES
// ═══════════════════════════════════════════════════════════════════════════════

function ClearingBatchesTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [network, setNetwork] = useState<string>('VISA');
  const [date, setDate] = useState(today);
  const [showIngest, setShowIngest] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [settleConfirm, setSettleConfirm] = useState<CardClearingBatch | null>(null);
  const [detailBatch, setDetailBatch] = useState<CardClearingBatch | null>(null);
  const isAdmin = useHasRole('CBS_ADMIN');
  const queryClient = useQueryClient();

  // Batch ingest form state — aligned to backend CHECK constraints
  const [batchForm, setBatchForm] = useState({
    network: 'VISA',
    batchType: 'CLEARING',
    clearingDate: today,
    settlementDate: today,
    currency: 'NGN',
    totalTransactions: 0,
    totalAmount: 0,
    totalFees: 0,
    interchangeAmount: 0,
    fileReference: '',
  });

  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});

  // Manual batch form
  const [manualForm, setManualForm] = useState({
    network: 'VISA',
    batchType: 'CLEARING',
    clearingDate: today,
    settlementDate: '',
    currency: 'NGN',
    totalTransactions: 0,
    totalAmount: 0,
    totalFees: 0,
    interchangeAmount: 0,
    fileReference: '',
  });

  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  // Queries — use direct API call for by-network query
  const { data: batches, isLoading, isError, refetch } = useQuery({
    queryKey: ['card-clearing', 'batches', network, date],
    queryFn: () => cardClearingApi.getBatchesByNetwork(network, date),
    staleTime: 30_000,
    enabled: !!network && !!date,
  });

  const ingestMutation = useIngestClearingBatch();
  const settleMutation = useSettleBatchByCode();
  const manualMutation = useManualClearingBatch();

  // Flatten to array
  const batchList = useMemo<CardClearingBatch[]>(() => {
    if (!batches) return [];
    return Array.isArray(batches) ? batches : [batches];
  }, [batches]);

  const validateBatchForm = (form: typeof batchForm) => {
    const errors: Record<string, string> = {};
    if (!form.clearingDate) errors.clearingDate = 'Required';
    if (!form.network) errors.network = 'Required';
    if (!form.currency) errors.currency = 'Required';
    if (!form.batchType) errors.batchType = 'Required';
    if (form.totalTransactions < 0) errors.totalTransactions = 'Must be >= 0';
    if (form.totalAmount < 0) errors.totalAmount = 'Must be >= 0';
    if (form.totalFees < 0) errors.totalFees = 'Must be >= 0';
    if (form.interchangeAmount < 0) errors.interchangeAmount = 'Must be >= 0';
    return errors;
  };

  const handleIngest = () => {
    const errors = validateBatchForm(batchForm);
    setBatchErrors(errors);
    if (Object.keys(errors).length > 0) return;

    ingestMutation.mutate({
      ...batchForm,
      // Backend calculates netSettlementAmount = totalAmount - totalFees - interchangeAmount
    }, {
      onSuccess: () => {
        toast.success('Clearing batch ingested successfully');
        setShowIngest(false);
        setBatchForm({ network: 'VISA', batchType: 'CLEARING', clearingDate: today, settlementDate: today, currency: 'NGN', totalTransactions: 0, totalAmount: 0, totalFees: 0, interchangeAmount: 0, fileReference: '' });
        setBatchErrors({});
        refetch();
      },
      onError: onMutationError,
    });
  };

  const handleManualBatch = () => {
    const errors = validateBatchForm(manualForm);
    setManualErrors(errors);
    if (Object.keys(errors).length > 0) return;

    manualMutation.mutate(manualForm, {
      onSuccess: () => {
        toast.success('Manual clearing batch created (RECEIVED)');
        setShowManual(false);
        setManualForm({ network: 'VISA', batchType: 'CLEARING', clearingDate: today, settlementDate: '', currency: 'NGN', totalTransactions: 0, totalAmount: 0, totalFees: 0, interchangeAmount: 0, fileReference: '' });
        setManualErrors({});
        refetch();
      },
      onError: onMutationError,
    });
  };

  const handleSettle = () => {
    if (!settleConfirm) return;
    settleMutation.mutate(settleConfirm.batchId, {
      onSuccess: () => {
        toast.success(`Batch ${settleConfirm.batchId} settled successfully`);
        setSettleConfirm(null);
        refetch();
      },
      onError: (err) => {
        onMutationError(err);
        setSettleConfirm(null);
      },
    });
  };

  const handleExport = () => {
    exportCsv(`clearing-batches-${network}-${date}`,
      ['Batch ID', 'Network', 'Type', 'Txn Count', 'Gross Amount', 'Fees', 'Interchange', 'Net Amount', 'Settlement Date', 'Status'],
      batchList.map(b => [b.batchId, b.network, b.batchType, String(b.totalTransactions), String(b.totalAmount), String(b.totalFees), String(b.interchangeAmount), String(b.netSettlementAmount), b.settlementDate ?? '', b.status]),
    );
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['card-clearing'] });
    refetch();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select value={network} onChange={e => setNetwork(e.target.value)}
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            {ALL_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button onClick={refreshAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {isAdmin && (
            <>
              <button onClick={() => setShowManual(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
                <FileText className="w-3.5 h-3.5" /> Manual Batch
              </button>
              <button onClick={() => setShowIngest(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Ingest Batch
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Table */}
      {isError ? <ErrorRetry message="Failed to load clearing batches." onRetry={() => refetch()} /> :
       isLoading ? <TableSkeleton rows={5} cols={9} /> : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Batch ID</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Network</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Txn Count</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Gross Amount</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net Amount</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Settlement Date</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {batchList.map(b => (
                <tr key={b.id || b.batchId} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setDetailBatch(b)}>
                  <td className="px-4 py-3 font-mono text-xs text-primary underline-offset-2 hover:underline">{b.batchId}</td>
                  <td className="px-4 py-3">{b.network}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium">{b.batchType}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{b.totalTransactions?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(b.totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatMoney(b.netSettlementAmount)}</td>
                  <td className="px-4 py-3 text-xs">{b.settlementDate ? formatDate(b.settlementDate) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    {isAdmin && SETTLEABLE_STATUSES.has(b.status) && (
                      <button onClick={() => setSettleConfirm(b)} disabled={settleMutation.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors">
                        <CheckCircle2 className="w-3 h-3" /> Settle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {batchList.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No clearing batches for this date/network.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settle Confirmation Dialog */}
      {settleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setSettleConfirm(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Confirm Settlement</h3>
                  <p className="text-xs text-muted-foreground">This action will mark the batch as SETTLED.</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Batch ID:</span><span className="font-mono">{settleConfirm.batchId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Network:</span><span>{settleConfirm.network}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Net Amount:</span><span className="font-mono font-semibold">{formatMoney(settleConfirm.netSettlementAmount)}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSettleConfirm(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleSettle} disabled={settleMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">
                  {settleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirm Settle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingest Batch Modal */}
      {showIngest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowIngest(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Ingest Clearing Batch</h2>
              <button onClick={() => setShowIngest(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Network *</label>
                  <select value={batchForm.network} onChange={e => setBatchForm(p => ({ ...p, network: e.target.value }))} className={cn(fc, batchErrors.network && 'border-red-500')}>
                    {ALL_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Batch Type *</label>
                  <select value={batchForm.batchType} onChange={e => setBatchForm(p => ({ ...p, batchType: e.target.value }))} className={cn(fc, batchErrors.batchType && 'border-red-500')}>
                    {BATCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Currency *</label>
                  <select value={batchForm.currency} onChange={e => setBatchForm(p => ({ ...p, currency: e.target.value }))} className={cn(fc, batchErrors.currency && 'border-red-500')}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Clearing Date *</label>
                  <input type="date" value={batchForm.clearingDate} onChange={e => setBatchForm(p => ({ ...p, clearingDate: e.target.value }))} className={cn(fc, batchErrors.clearingDate && 'border-red-500')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Settlement Date</label>
                  <input type="date" value={batchForm.settlementDate} onChange={e => setBatchForm(p => ({ ...p, settlementDate: e.target.value }))} className={fc} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Txn Count</label>
                  <input type="number" min="0" value={batchForm.totalTransactions} onChange={e => setBatchForm(p => ({ ...p, totalTransactions: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Total Amount</label>
                  <input type="number" step="0.01" min="0" value={batchForm.totalAmount} onChange={e => setBatchForm(p => ({ ...p, totalAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Total Fees</label>
                  <input type="number" step="0.01" min="0" value={batchForm.totalFees} onChange={e => setBatchForm(p => ({ ...p, totalFees: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Interchange Amount</label>
                  <input type="number" step="0.01" min="0" value={batchForm.interchangeAmount} onChange={e => setBatchForm(p => ({ ...p, interchangeAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">File Reference</label>
                <input value={batchForm.fileReference} onChange={e => setBatchForm(p => ({ ...p, fileReference: e.target.value }))}
                  placeholder="e.g. VISA_CLR_20260320_001.dat" className={fc} />
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-medium">Net Settlement (auto-calculated by backend):</span>{' '}
                <span className="font-mono">{formatMoney(batchForm.totalAmount - batchForm.totalFees - batchForm.interchangeAmount)}</span>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setShowIngest(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleIngest} disabled={ingestMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {ingestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Ingest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Batch Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowManual(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Manual Clearing Batch</h2>
              <button onClick={() => setShowManual(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Manual batches are created with status RECEIVED and must go through normal clearing workflow.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Network *</label>
                  <select value={manualForm.network} onChange={e => setManualForm(p => ({ ...p, network: e.target.value }))} className={cn(fc, manualErrors.network && 'border-red-500')}>
                    {ALL_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Batch Type *</label>
                  <select value={manualForm.batchType} onChange={e => setManualForm(p => ({ ...p, batchType: e.target.value }))} className={cn(fc, manualErrors.batchType && 'border-red-500')}>
                    {BATCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Clearing Date *</label>
                  <input type="date" value={manualForm.clearingDate} onChange={e => setManualForm(p => ({ ...p, clearingDate: e.target.value }))} className={cn(fc, manualErrors.clearingDate && 'border-red-500')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Currency *</label>
                  <select value={manualForm.currency} onChange={e => setManualForm(p => ({ ...p, currency: e.target.value }))} className={cn(fc, manualErrors.currency && 'border-red-500')}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Txn Count</label>
                  <input type="number" min="0" value={manualForm.totalTransactions} onChange={e => setManualForm(p => ({ ...p, totalTransactions: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Total Amount</label>
                  <input type="number" step="0.01" min="0" value={manualForm.totalAmount} onChange={e => setManualForm(p => ({ ...p, totalAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Total Fees</label>
                  <input type="number" step="0.01" min="0" value={manualForm.totalFees} onChange={e => setManualForm(p => ({ ...p, totalFees: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Interchange Amount</label>
                  <input type="number" step="0.01" min="0" value={manualForm.interchangeAmount} onChange={e => setManualForm(p => ({ ...p, interchangeAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">File Reference</label>
                <input value={manualForm.fileReference} onChange={e => setManualForm(p => ({ ...p, fileReference: e.target.value }))} placeholder="Manual entry reference" className={fc} />
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setShowManual(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleManualBatch} disabled={manualMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {manualMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Detail Panel */}
      {detailBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setDetailBatch(null)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <button onClick={() => setDetailBatch(null)} className="p-1 rounded-md hover:bg-muted">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-base font-semibold">Batch Detail</h2>
              </div>
              <StatusBadge status={detailBatch.status} />
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Batch ID</div>
                  <div className="font-mono font-medium">{detailBatch.batchId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Network</div>
                  <div className="font-medium">{detailBatch.network}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Batch Type</div>
                  <div>{detailBatch.batchType}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Currency</div>
                  <div>{detailBatch.currency}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Clearing Date</div>
                  <div>{detailBatch.clearingDate ? formatDate(detailBatch.clearingDate) : '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Settlement Date</div>
                  <div>{detailBatch.settlementDate ? formatDate(detailBatch.settlementDate) : '—'}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Financial Summary</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Transactions</div>
                    <div className="font-mono font-medium">{detailBatch.totalTransactions?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Gross Amount</div>
                    <div className="font-mono">{formatMoney(detailBatch.totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Fees</div>
                    <div className="font-mono text-muted-foreground">{formatMoney(detailBatch.totalFees)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Interchange</div>
                    <div className="font-mono text-muted-foreground">{formatMoney(detailBatch.interchangeAmount)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Net Settlement Amount</div>
                    <div className={cn('font-mono text-lg font-semibold', detailBatch.netSettlementAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {formatMoney(detailBatch.netSettlementAmount)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Processing</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Exception Count</div>
                    <div className={cn('font-mono', detailBatch.exceptionCount > 0 ? 'text-red-600 font-semibold' : '')}>{detailBatch.exceptionCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">File Reference</div>
                    <div className="font-mono text-xs truncate" title={detailBatch.fileReference}>{detailBatch.fileReference || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="text-xs">{detailBatch.createdAt ? formatDateTime(detailBatch.createdAt) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Reconciled</div>
                    <div className="text-xs">{detailBatch.reconciledAt ? formatDateTime(detailBatch.reconciledAt) : '—'}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setDetailBatch(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Close</button>
                {isAdmin && SETTLEABLE_STATUSES.has(detailBatch.status) && (
                  <button onClick={() => { setSettleConfirm(detailBatch); setDetailBatch(null); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                    <CheckCircle2 className="w-4 h-4" /> Settle Batch
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: INTERCHANGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function InterchangeTab() {
  const today = new Date().toISOString().slice(0, 10);
  const queryClient = useQueryClient();

  // Aggregate interchange from settlement positions across all networks
  const queries = NETWORKS.map((network) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['card-clearing', 'positions', today, network],
      queryFn: () => cardClearingApi.positions(today, network),
      staleTime: 30_000,
    }),
  );

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);

  const interchangeByScheme = NETWORKS.map((network, i) => {
    const positions = queries[i].data ?? [];
    const volume = positions.length;
    const value = positions.reduce((s, p) => s + (p.grossDebits ?? 0) + (p.grossCredits ?? 0), 0);
    const earned = positions.reduce((s, p) => s + (p.interchangeReceivable ?? 0), 0);
    const paid = positions.reduce((s, p) => s + (p.interchangePayable ?? 0), 0);
    const fees = positions.reduce((s, p) => s + (p.schemeFees ?? 0), 0);
    const effectiveRate = value > 0 ? ((earned - paid) / value) * 100 : 0;
    return { network, volume, value, earned, paid, net: earned - paid, fees, effectiveRate };
  });

  const totals = interchangeByScheme.reduce((t, r) => ({
    volume: t.volume + r.volume, value: t.value + r.value, earned: t.earned + r.earned, paid: t.paid + r.paid, net: t.net + r.net, fees: t.fees + r.fees,
  }), { volume: 0, value: 0, earned: 0, paid: 0, net: 0, fees: 0 });

  const avgRate = totals.value > 0 ? (totals.net / totals.value) * 100 : 0;

  const handleExport = () => {
    exportCsv('interchange-analysis',
      ['Network', 'Volume', 'Value', 'Earned', 'Paid', 'Net', 'Scheme Fees', 'Effective Rate'],
      interchangeByScheme.map(r => [r.network, String(r.volume), String(r.value), String(r.earned), String(r.paid), String(r.net), String(r.fees), r.effectiveRate.toFixed(4)]),
    );
  };

  if (isError) return <div className="p-4"><ErrorRetry message="Failed to load interchange data." onRetry={() => queryClient.invalidateQueries({ queryKey: ['card-clearing'] })} /></div>;

  return (
    <div className="p-4 space-y-6">
      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Interchange Earned</div>
            <div className="stat-value text-green-600 dark:text-green-400 font-mono">{formatMoney(totals.earned)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Interchange Paid</div>
            <div className="stat-value text-red-600 dark:text-red-400 font-mono">{formatMoney(totals.paid)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Net Interchange</div>
            <div className={cn('stat-value font-mono', totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {totals.net >= 0 ? '+' : ''}{formatMoney(totals.net)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Effective Rate</div>
            <div className="stat-value font-mono">{avgRate.toFixed(3)}%</div>
          </div>
        </div>
      )}

      {/* Scheme Breakdown */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Breakdown by Scheme</h3>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={3} cols={8} /> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Network</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Volume</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Value</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Earned</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Scheme Fees</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Eff. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {interchangeByScheme.map(r => (
                <tr key={r.network} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.network}</td>
                  <td className="px-4 py-3 font-mono text-right">{r.volume.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-right">{formatMoney(r.value)}</td>
                  <td className="px-4 py-3 font-mono text-right text-green-600 dark:text-green-400">{formatMoney(r.earned)}</td>
                  <td className="px-4 py-3 font-mono text-right text-red-600 dark:text-red-400">{formatMoney(r.paid)}</td>
                  <td className={cn('px-4 py-3 font-mono text-right font-semibold', r.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {r.net >= 0 ? '+' : ''}{formatMoney(r.net)}
                  </td>
                  <td className="px-4 py-3 font-mono text-right text-muted-foreground">{formatMoney(r.fees)}</td>
                  <td className="px-4 py-3 font-mono text-right">{r.effectiveRate.toFixed(3)}%</td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">TOTAL</td>
                <td className="px-4 py-2.5 font-mono text-right">{totals.volume.toLocaleString()}</td>
                <td className="px-4 py-2.5 font-mono text-right">{formatMoney(totals.value)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-green-600 dark:text-green-400">{formatMoney(totals.earned)}</td>
                <td className="px-4 py-2.5 font-mono text-right text-red-600 dark:text-red-400">{formatMoney(totals.paid)}</td>
                <td className={cn('px-4 py-2.5 font-mono text-right', totals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  {totals.net >= 0 ? '+' : ''}{formatMoney(totals.net)}
                </td>
                <td className="px-4 py-2.5 font-mono text-right text-muted-foreground">{formatMoney(totals.fees)}</td>
                <td className="px-4 py-2.5 font-mono text-right">{avgRate.toFixed(3)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════════

function ReconciliationTab() {
  const today = new Date().toISOString().slice(0, 10);
  const queryClient = useQueryClient();
  const updateStatus = useUpdatePositionStatus();
  const escalate = useEscalatePosition();
  const isAdmin = useHasRole('CBS_ADMIN');
  const isMutating = updateStatus.isPending || escalate.isPending;

  // Derive reconciliation data from settlement positions
  const queries = NETWORKS.map((network) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['card-clearing', 'positions', today, network],
      queryFn: () => cardClearingApi.positions(today, network),
      staleTime: 30_000,
    }),
  );

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);

  // Build reconciliation items from position data
  const allPositions = useMemo(() => {
    const positions: (CardSettlementPosition & { ageDays: number })[] = [];
    queries.forEach(q => {
      (q.data ?? []).forEach(p => {
        const created = new Date(p.createdAt || p.settlementDate || today);
        const ageDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
        positions.push({ ...p, ageDays });
      });
    });
    return positions;
  }, [queries, today]);

  // Classify items using correct backend position statuses
  const matched = allPositions.filter(p => p.status === 'SETTLED' || p.status === 'CONFIRMED');
  const unmatched = allPositions.filter(p => p.status === 'PENDING' || p.status === 'CALCULATED' || p.status === 'DISPUTED');
  const exceptions = allPositions.filter(p => p.status === 'DISPUTED');
  const matchRate = allPositions.length > 0 ? (matched.length / allPositions.length) * 100 : 100;

  const handleManualMatch = (position: CardSettlementPosition & { ageDays: number }) => {
    if (!confirm(`Mark position #${position.id} (${position.network} — ${formatMoney(position.netPosition)}) as CONFIRMED?`)) return;
    updateStatus.mutate(
      { id: position.id, status: 'CONFIRMED', notes: 'Manually matched via reconciliation' },
      {
        onSuccess: () => {
          toast.success(`Position #${position.id} matched and confirmed`);
          queryClient.invalidateQueries({ queryKey: ['card-clearing'] });
        },
        onError: onMutationError,
      },
    );
  };

  const handleWriteOff = (position: CardSettlementPosition & { ageDays: number }) => {
    if (!confirm(`Write off position #${position.id} (${position.network} — ${formatMoney(position.netPosition)})? This will mark it as DISPUTED.`)) return;
    updateStatus.mutate(
      { id: position.id, status: 'DISPUTED', notes: 'Written off via reconciliation' },
      {
        onSuccess: () => {
          toast.success(`Position #${position.id} written off`);
          queryClient.invalidateQueries({ queryKey: ['card-clearing'] });
        },
        onError: onMutationError,
      },
    );
  };

  const handleEscalate = (position: CardSettlementPosition & { ageDays: number }) => {
    const reason = `Escalated from reconciliation — age: ${position.ageDays} days, net: ${formatMoney(position.netPosition)}`;
    if (!confirm(`Escalate position #${position.id} (${position.network})? This will mark it as DISPUTED and log an escalation.`)) return;
    escalate.mutate(
      { id: position.id, reason },
      {
        onSuccess: () => {
          toast.success(`Position #${position.id} escalated`);
          queryClient.invalidateQueries({ queryKey: ['card-clearing'] });
        },
        onError: onMutationError,
      },
    );
  };

  const handleExport = () => {
    exportCsv('reconciliation-exceptions',
      ['ID', 'Network', 'Counterparty', 'Gross Debits', 'Gross Credits', 'Net', 'Status', 'Age (days)'],
      unmatched.map(p => [String(p.id), p.network, p.counterpartyName, String(p.grossDebits), String(p.grossCredits), String(p.netPosition), p.status, String(p.ageDays)]),
    );
  };

  if (isError) return <div className="p-4"><ErrorRetry message="Failed to load reconciliation data." onRetry={() => queryClient.invalidateQueries({ queryKey: ['card-clearing'] })} /></div>;

  return (
    <div className="p-4 space-y-6">
      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between"><div className="stat-label">Matched</div><CheckCircle2 className="w-5 h-5 text-green-500/50" /></div>
            <div className="stat-value text-green-600 dark:text-green-400">{matched.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between"><div className="stat-label">Unmatched</div><Clock className="w-5 h-5 text-amber-500/50" /></div>
            <div className="stat-value text-amber-600 dark:text-amber-400">{unmatched.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between"><div className="stat-label">Exceptions</div><XCircle className="w-5 h-5 text-red-500/50" /></div>
            <div className="stat-value text-red-600 dark:text-red-400">{exceptions.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between"><div className="stat-label">Match Rate</div><TrendingUp className="w-5 h-5 text-primary/50" /></div>
            <div className={cn('stat-value', matchRate >= 95 ? 'text-green-600 dark:text-green-400' : matchRate >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
              {matchRate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Unmatched / Exception items */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Unmatched & Exception Items</h3>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={9} /> : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Network</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Counterparty</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Our Record</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net Position</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Difference</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Age</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                {isAdmin && <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {unmatched.map(p => {
                const diff = (p.grossDebits ?? 0) - (p.grossCredits ?? 0) - (p.netPosition ?? 0);
                const ageColor = p.ageDays > 7 ? 'text-red-600 dark:text-red-400 font-semibold' : p.ageDays > 3 ? 'text-amber-600 dark:text-amber-400' : '';
                return (
                  <tr key={p.id} className={cn('hover:bg-muted/20 transition-colors', p.ageDays > 7 && 'bg-red-50/30 dark:bg-red-900/5')}>
                    <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-3">{p.network}</td>
                    <td className="px-4 py-3 text-xs">{p.counterpartyName || p.counterpartyBic || '—'}</td>
                    <td className="px-4 py-3 font-mono text-right">{formatMoney((p.grossDebits ?? 0) - (p.grossCredits ?? 0))}</td>
                    <td className="px-4 py-3 font-mono text-right">{formatMoney(p.netPosition)}</td>
                    <td className={cn('px-4 py-3 font-mono text-right', diff !== 0 ? 'text-red-600 dark:text-red-400 font-semibold' : '')}>
                      {diff !== 0 ? formatMoney(diff) : '—'}
                    </td>
                    <td className={cn('px-4 py-3 text-center text-xs font-mono', ageColor)}>
                      {p.ageDays}d
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleManualMatch(p)} disabled={isMutating} className="p-1 rounded hover:bg-green-50 text-green-600 dark:hover:bg-green-900/20 disabled:opacity-50" title="Match Manually">
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleWriteOff(p)} disabled={isMutating} className="p-1 rounded hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 disabled:opacity-50" title="Write Off">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleEscalate(p)} disabled={isMutating} className="p-1 rounded hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-900/20 disabled:opacity-50" title="Escalate">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {unmatched.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">All items reconciled — no exceptions.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function CardClearingPage() {
  useEffect(() => { document.title = 'Clearing & Settlement | CBS'; }, []);

  const today = new Date().toISOString().slice(0, 10);

  // Top-level stats from settlement positions
  const queries = NETWORKS.map((network) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['card-clearing', 'positions', today, network],
      queryFn: () => cardClearingApi.positions(today, network),
      staleTime: 30_000,
    }),
  );

  const isLoading = queries.some(q => q.isLoading);

  const totals = useMemo(() => {
    let entries = 0, gross = 0, interchange = 0;
    queries.forEach(q => {
      const positions = q.data ?? [];
      entries += positions.length;
      positions.forEach(p => {
        gross += (p.grossDebits ?? 0) + (p.grossCredits ?? 0);
        interchange += (p.interchangeReceivable ?? 0);
      });
    });
    return { entries, gross, interchange };
  }, [queries]);

  return (
    <>
      <PageHeader title="Card Clearing & Settlement" subtitle="Clearing batches, settlement positions, interchange, and reconciliation" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Networks" value={NETWORKS.length} format="number" icon={FileCheck} loading={isLoading} />
          <StatCard label="Settlement Entries" value={totals.entries} format="number" icon={ArrowLeftRight} loading={isLoading} />
          <StatCard label="Gross Value" value={totals.gross} format="money" compact icon={Landmark} loading={isLoading} />
          <StatCard label="Interchange Earned" value={totals.interchange} format="money" compact icon={TrendingUp} loading={isLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'position', label: 'Settlement Position', content: <SettlementPositionTab /> },
          { id: 'batches', label: 'Clearing Batches', content: <ClearingBatchesTab /> },
          { id: 'interchange', label: 'Interchange', content: <InterchangeTab /> },
          { id: 'reconciliation', label: 'Reconciliation', content: <ReconciliationTab /> },
        ]} />
      </div>
    </>
  );
}
