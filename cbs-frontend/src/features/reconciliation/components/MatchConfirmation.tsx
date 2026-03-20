import { useState } from 'react';
import { X, Link2, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { createManualMatch, type ReconciliationEntry } from '../api/reconciliationApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.abs(Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ label, entry, accent }: { label: string; entry: ReconciliationEntry; accent: string }) {
  return (
    <div className={cn('flex-1 min-w-0 rounded-lg border px-4 py-3', accent)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span className="font-mono">{formatDate(entry.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-[11px] break-all text-right">{entry.reference}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className={cn(
            'font-mono font-semibold',
            entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
          )}>
            {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span>{entry.type}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Description</span>
          <p className="mt-0.5 font-medium truncate" title={entry.description}>{entry.description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MatchConfirmationProps {
  sessionId: string;
  ourEntry: ReconciliationEntry;
  bankEntry: ReconciliationEntry;
  onConfirmed: () => void;
  onCancel: () => void;
}

export function MatchConfirmation({ sessionId, ourEntry, bankEntry, onConfirmed, onCancel }: MatchConfirmationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountDiff = Math.abs(ourEntry.amount - bankEntry.amount);
  const isExactMatch = amountDiff < 0.01;
  const dateDiff = daysBetween(ourEntry.date, bankEntry.date);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await createManualMatch(sessionId, [ourEntry.id], [bankEntry.id]);
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold">Confirm Match</h2>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Side-by-side comparison */}
          <div className="px-6 py-5">
            <div className="flex gap-3">
              <EntryCard label="Our Entry" entry={ourEntry} accent="bg-blue-50/50 dark:bg-blue-900/10" />
              <EntryCard label="Bank Entry" entry={bankEntry} accent="bg-purple-50/50 dark:bg-purple-900/10" />
            </div>

            {/* Match indicators */}
            <div className="mt-4 space-y-2">
              <div className={cn(
                'rounded-lg border px-4 py-2.5 flex items-center justify-between text-xs',
                isExactMatch
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
              )}>
                <div className="flex items-center gap-1.5">
                  {isExactMatch
                    ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  <span className="font-medium">{isExactMatch ? 'Exact amount match' : 'Amount difference'}</span>
                </div>
                {!isExactMatch && (
                  <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                    {formatMoney(amountDiff)}
                  </span>
                )}
              </div>

              <div className={cn(
                'rounded-lg border px-4 py-2.5 flex items-center justify-between text-xs',
                dateDiff === 0
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : dateDiff <= 3
                    ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
              )}>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Date proximity</span>
                </div>
                <span className="font-mono font-semibold">
                  {dateDiff === 0 ? 'Same day' : `${dateDiff} day${dateDiff > 1 ? 's' : ''} apart`}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-4 py-2.5 text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              Confirm Match
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
