import { useState } from 'react';
import { Loader2, Play, CheckCircle2, AlertTriangle, Calendar, Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlReconRuns, useGlReconByDate, useRunGlReconciliation } from '../hooks/useReconciliation';
import type { SubledgerReconRun, SubledgerType } from '../types/nostro';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUBLEDGER_TYPES: { value: SubledgerType; label: string }[] = [
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'FIXED_DEPOSITS', label: 'Fixed Deposits' },
  { value: 'RECURRING_DEPOSITS', label: 'Recurring Deposits' },
  { value: 'DEPOSITS', label: 'All Deposits' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function statusBadge(run: SubledgerReconRun) {
  if (run.balanced) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3" /> Balanced
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
      <AlertTriangle className="w-3 h-3" /> Exceptions ({run.exceptionCount})
    </span>
  );
}

// ─── Run Reconciliation Form ─────────────────────────────────────────────────

function RunReconForm() {
  const runMutation = useRunGlReconciliation();
  const [form, setForm] = useState({
    subledgerType: 'ACCOUNTS' as SubledgerType,
    glCode: '',
    reconDate: new Date().toISOString().slice(0, 10),
    branchCode: '',
    currencyCode: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runMutation.mutate({
      subledgerType: form.subledgerType,
      glCode: form.glCode,
      reconDate: form.reconDate,
      branchCode: form.branchCode || undefined,
      currencyCode: form.currencyCode || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">Run Sub-Ledger Reconciliation</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
          <select
            value={form.subledgerType}
            onChange={(e) => setForm({ ...form, subledgerType: e.target.value as SubledgerType })}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {SUBLEDGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">GL Code</label>
          <input
            required
            value={form.glCode}
            onChange={(e) => setForm({ ...form, glCode: e.target.value })}
            placeholder="e.g. 1001"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Recon Date</label>
          <input
            type="date"
            required
            value={form.reconDate}
            onChange={(e) => setForm({ ...form, reconDate: e.target.value })}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Branch</label>
          <input
            value={form.branchCode}
            onChange={(e) => setForm({ ...form, branchCode: e.target.value })}
            placeholder="Optional"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
          <input
            value={form.currencyCode}
            onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
            placeholder="Optional"
            maxLength={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!form.glCode || runMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {runMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
          ) : (
            <><Play className="w-4 h-4" /> Run Reconciliation</>
          )}
        </button>
        {runMutation.isSuccess && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reconciliation completed — {runMutation.data.balanced ? 'Balanced' : `${runMutation.data.exceptionCount} exception(s)`}
          </span>
        )}
        {runMutation.isError && (
          <span className="text-xs text-destructive">
            Failed to run reconciliation. Check GL code and permissions.
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Results Table ───────────────────────────────────────────────────────────

function ReconResultsTable({ runs, loading }: { runs: SubledgerReconRun[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No reconciliation runs found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Sub-Ledger Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">GL Code</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">GL Balance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Sub-Ledger Balance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Difference</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Resolved By</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{run.reconDate}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {run.subledgerType.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{run.glCode}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{formatAmount(run.glBalance)}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{formatAmount(run.subledgerBalance)}</td>
                <td className={cn(
                  'px-4 py-3 text-right font-mono tabular-nums font-semibold',
                  run.balanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                )}>
                  {formatAmount(run.difference)}
                </td>
                <td className="px-4 py-3 text-center">{statusBadge(run)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{run.resolvedBy || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

export function SubLedgerReconTab() {
  const [viewMode, setViewMode] = useState<'history' | 'byDate'>('history');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data: allRuns = [], isLoading: allLoading } = useGlReconRuns({ page: 0, size: 50 });
  const { data: dateRuns = [], isLoading: dateLoading } = useGlReconByDate(
    viewMode === 'byDate' ? filterDate : '',
  );

  const displayRuns = viewMode === 'byDate' ? dateRuns : allRuns;
  const isLoading = viewMode === 'byDate' ? dateLoading : allLoading;

  const filteredRuns = typeFilter === 'ALL'
    ? displayRuns
    : displayRuns.filter((r) => r.subledgerType === typeFilter);

  // Stats
  const totalRuns = displayRuns.length;
  const balancedCount = displayRuns.filter((r) => r.balanced).length;
  const exceptionCount = displayRuns.filter((r) => !r.balanced).length;

  return (
    <div className="space-y-5">
      {/* Run Reconciliation Form */}
      <RunReconForm />

      {/* View Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            All History
          </button>
          <button
            type="button"
            onClick={() => setViewMode('byDate')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'byDate' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            By Date
          </button>
        </div>

        {viewMode === 'byDate' && (
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          />
        )}

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            <option value="ALL">All Types</option>
            {SUBLEDGER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {typeFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear Filter
          </button>
        )}

        {/* Summary stats */}
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span>Total: <strong className="text-foreground">{totalRuns}</strong></span>
          <span className="text-green-600 dark:text-green-400">Balanced: <strong>{balancedCount}</strong></span>
          <span className="text-red-600 dark:text-red-400">Exceptions: <strong>{exceptionCount}</strong></span>
        </div>
      </div>

      {/* Results Table */}
      <ReconResultsTable runs={filteredRuns} loading={isLoading} />
    </div>
  );
}
