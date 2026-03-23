import { useState } from 'react';
import { ChevronDown, ChevronRight, Undo2, Loader2 } from 'lucide-react';
import { StatusBadge, ConfirmDialog } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { glApi } from '../../api/glApi';
import type { JournalEntry } from '../../api/glApi';

interface JournalEntryTableProps {
  entries: JournalEntry[];
  isLoading: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  SYSTEM: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MANUAL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function JournalEntryTable({ entries, isLoading }: JournalEntryTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [reversalTarget, setReversalTarget] = useState<JournalEntry | null>(null);
  const queryClient = useQueryClient();

  const reversalMutation = useMutation({
    mutationFn: (id: number) => glApi.reverseJournal(id),
    onSuccess: (reversal) => {
      toast.success(`Journal reversed successfully. Reversal journal: ${reversal.journalNumber}`);
      queryClient.invalidateQueries({ queryKey: ['gl-journals'] });
      setReversalTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to reverse journal entry');
      setReversalTarget(null);
    },
  });

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
              <th className="w-8 px-3 py-2.5" />
              {['Journal #', 'Date', 'Description', 'Total Debit', 'Total Credit', 'Source', 'Status', 'Created By', ''].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="surface-card py-16 text-center text-muted-foreground text-sm">
        No journal entries found. Adjust your filters or create a new entry.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
              <th className="w-8 px-3 py-2.5" />
              <th className="text-left px-4 py-2.5 font-medium">Journal #</th>
              <th className="text-left px-4 py-2.5 font-medium">Date</th>
              <th className="text-left px-4 py-2.5 font-medium">Description</th>
              <th className="text-right px-4 py-2.5 font-medium">Total Debit</th>
              <th className="text-right px-4 py-2.5 font-medium">Total Credit</th>
              <th className="text-left px-4 py-2.5 font-medium">Source</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Created By</th>
              <th className="w-20 px-4 py-2.5 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isOpen = expanded.has(entry.id);
              const sourceLabel = entry.sourceModule ?? 'SYSTEM';
              const canReverse = entry.status === 'POSTED';
              return (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => toggle(entry.id)}
                    className={cn(
                      'border-b border-border/40 cursor-pointer transition-colors',
                      isOpen ? 'bg-primary/5' : 'hover:bg-muted/30',
                      entry.status === 'REVERSED' && 'opacity-60',
                    )}
                  >
                    <td className="px-3 py-3 text-muted-foreground">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{entry.journalNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(entry.valueDate)}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="truncate block" title={entry.description}>{entry.description}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(entry.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(entry.totalCredit)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', SOURCE_COLORS[sourceLabel] ?? SOURCE_COLORS['SYSTEM'])}>
                        {sourceLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{entry.createdBy}</td>
                    <td className="px-4 py-3 text-center">
                      {canReverse && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReversalTarget(entry);
                          }}
                          disabled={reversalMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Reverse this journal entry"
                        >
                          <Undo2 className="w-3 h-3" />
                          Reverse
                        </button>
                      )}
                      {entry.status === 'REVERSED' && entry.reversalJournalId && (
                        <span className="text-[10px] text-muted-foreground">
                          Rev #{entry.reversalJournalId}
                        </span>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${entry.id}-detail`} className="border-b bg-muted/10">
                      <td colSpan={10} className="px-6 py-3">
                        <div className="surface-card overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/20 border-b text-muted-foreground">
                                <th className="text-left px-4 py-2 font-medium">GL Code</th>
                                <th className="text-left px-4 py-2 font-medium">Currency</th>
                                <th className="text-left px-4 py-2 font-medium">Narration</th>
                                <th className="text-right px-4 py-2 font-medium">Debit</th>
                                <th className="text-right px-4 py-2 font-medium">Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map((line, idx) => (
                                <tr key={idx} className="border-b border-border/40 last:border-0">
                                  <td className="px-4 py-2 font-mono font-medium">{line.glCode}</td>
                                  <td className="px-4 py-2 text-muted-foreground">{line.currencyCode}</td>
                                  <td className="px-4 py-2 text-muted-foreground">{line.narration ?? '—'}</td>
                                  <td className="px-4 py-2 text-right font-mono">
                                    {line.debitAmount > 0 ? formatMoney(line.debitAmount) : '—'}
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono">
                                    {line.creditAmount > 0 ? formatMoney(line.creditAmount) : '—'}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-muted/20 font-semibold border-t">
                                <td colSpan={3} className="px-4 py-2">TOTAL</td>
                                <td className="px-4 py-2 text-right font-mono">{formatMoney(entry.totalDebit)}</td>
                                <td className="px-4 py-2 text-right font-mono">{formatMoney(entry.totalCredit)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!reversalTarget}
        onClose={() => setReversalTarget(null)}
        onConfirm={() => {
          if (reversalTarget) reversalMutation.mutate(reversalTarget.id);
        }}
        title="Reverse Journal Entry"
        description={
          reversalTarget
            ? `This will create a reversal journal that swaps all debits and credits for journal ${reversalTarget.journalNumber} (${formatMoney(reversalTarget.totalDebit)} DR / ${formatMoney(reversalTarget.totalCredit)} CR). This action cannot be undone.`
            : ''
        }
        confirmLabel="Reverse Journal"
        isLoading={reversalMutation.isPending}
      />
    </>
  );
}
