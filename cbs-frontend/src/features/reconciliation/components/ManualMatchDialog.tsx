import { useState } from 'react';
import { X, Link2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry } from '../api/reconciliationApi';

interface ManualMatchDialogProps {
  open: boolean;
  ourEntry: ReconciliationEntry | null;
  bankEntries: ReconciliationEntry[];
  onConfirm: (ourId: string, bankIds: string[]) => void | Promise<void>;
  onClose: () => void;
}

export function ManualMatchDialog({ open, ourEntry, bankEntries, onConfirm, onClose }: ManualMatchDialogProps) {
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!open || !ourEntry) return null;

  const candidateBankEntries = bankEntries.filter(
    (e) => e.status === 'UNMATCHED' || e.status === 'PARTIAL',
  );

  const toggleBank = (id: string) => {
    setSelectedBankIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedTotal = bankEntries
    .filter((e) => selectedBankIds.includes(e.id))
    .reduce((sum, e) => sum + (e.type === 'CREDIT' ? e.amount : -e.amount), 0);

  const ourAmount = ourEntry.type === 'CREDIT' ? ourEntry.amount : -ourEntry.amount;
  const difference = ourAmount - selectedTotal;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleConfirm = async () => {
    if (selectedBankIds.length === 0) return;
    setLoading(true);
    try {
      await onConfirm(ourEntry.id, selectedBankIds);
      setSelectedBankIds([]);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold">Manual Match</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Our Entry */}
            <div className="px-6 pt-5 pb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Our Entry</p>
              <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium mt-0.5">{formatDate(ourEntry.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-mono font-medium mt-0.5 break-all">{ourEntry.reference}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className={cn('font-mono font-semibold mt-0.5', ourEntry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground')}>
                    {ourEntry.type === 'CREDIT' ? '+' : '-'}{formatMoney(ourEntry.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium mt-0.5">{ourEntry.type}</p>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium mt-0.5">{ourEntry.description}</p>
                </div>
              </div>
            </div>

            {/* Bank Entries Selection */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Select Bank Statement Entry (one-to-many supported)
                </p>
                <span className="text-xs text-muted-foreground">{selectedBankIds.length} selected</span>
              </div>

              {candidateBankEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No unmatched bank entries available
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {candidateBankEntries.map((entry) => {
                    const selected = selectedBankIds.includes(entry.id);
                    return (
                      <label
                        key={entry.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-colors text-xs',
                          selected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'hover:bg-muted/50 bg-background',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleBank(entry.id)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-y-1 gap-x-3">
                          <div>
                            <span className="text-muted-foreground">Date: </span>
                            <span className="font-mono">{formatDate(entry.date)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ref: </span>
                            <span className="font-mono break-all">{entry.reference}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount: </span>
                            <span className={cn('font-mono font-semibold', entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : '')}>
                              {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type: </span>
                            <span>{entry.type}</span>
                          </div>
                          <div className="col-span-2 sm:col-span-4 truncate">
                            <span className="text-muted-foreground">Desc: </span>
                            <span>{entry.description}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Amount Comparison */}
            {selectedBankIds.length > 0 && (
              <div className="px-6 pb-5">
                <div className={cn(
                  'rounded-lg border px-4 py-3 flex items-center justify-between text-xs',
                  isBalanced
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800',
                )}>
                  <div className="flex items-center gap-1.5">
                    {isBalanced ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="font-medium">{isBalanced ? 'Amounts balance' : 'Amount difference'}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span>Our: <span className="font-mono font-semibold">{formatMoney(ourEntry.amount)}</span></span>
                    <span>Bank total: <span className="font-mono font-semibold">{formatMoney(Math.abs(selectedTotal))}</span></span>
                    {!isBalanced && (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        Diff: {formatMoney(Math.abs(difference))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedBankIds.length === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Link2 className="w-4 h-4" />
              Confirm Match{selectedBankIds.length > 1 ? ` (${selectedBankIds.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
