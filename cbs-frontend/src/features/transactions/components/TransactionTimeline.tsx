import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction } from '../api/transactionApi';

interface TransactionTimelineProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
  flashingTransactionIds?: string[];
  highlightedTransactionId?: string | null;
}

function getTimelineGroupLabel(dateTime: string): string {
  const parsed = parseISO(dateTime);
  if (isToday(parsed)) return `Today, ${format(parsed, 'MMMM d, yyyy')}`;
  if (isYesterday(parsed)) return `Yesterday, ${format(parsed, 'MMMM d, yyyy')}`;
  return format(parsed, 'EEEE, MMMM d, yyyy');
}

function getPrimaryCounterparty(transaction: Transaction): string {
  return transaction.toAccountName
    ?? transaction.fromAccountName
    ?? transaction.toAccount
    ?? transaction.fromAccount
    ?? transaction.description;
}

function getDisplayAmount(transaction: Transaction): number {
  return transaction.debitAmount ?? transaction.creditAmount ?? 0;
}

export function TransactionTimeline({
  transactions,
  onSelectTransaction,
  flashingTransactionIds = [],
  highlightedTransactionId,
}: TransactionTimelineProps) {
  const grouped = transactions.reduce<Record<string, Transaction[]>>((accumulator, transaction) => {
    const label = getTimelineGroupLabel(transaction.dateTime);
    accumulator[label] = accumulator[label] ? [...accumulator[label], transaction] : [transaction];
    return accumulator;
  }, {});

  return (
    <div className="space-y-6 surface-card p-5">
      {Object.entries(grouped).map(([label, items]) => (
        <section key={label} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</h3>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            {items.map((transaction) => {
              const isFlashing = flashingTransactionIds.includes(String(transaction.id));
              const isHighlighted = highlightedTransactionId === String(transaction.id);

              return (
                <button
                  key={transaction.id}
                  onClick={() => onSelectTransaction(transaction)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-muted/20',
                    isFlashing && 'border-green-300 bg-green-50 shadow-[0_0_0_1px_rgba(34,197,94,0.2)] dark:border-green-700/60 dark:bg-green-900/15',
                    isHighlighted && 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]',
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="min-w-20 text-sm font-medium text-muted-foreground">
                        {format(parseISO(transaction.dateTime), 'hh:mm a')}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{transaction.type}</span>
                          <span className="text-sm text-muted-foreground">→</span>
                          <span className="text-sm">{getPrimaryCounterparty(transaction)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{transaction.narration}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          'font-mono text-sm font-semibold',
                          transaction.debitAmount ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                        )}
                      >
                        {formatMoney(getDisplayAmount(transaction))}
                      </span>
                      <StatusBadge status={transaction.status} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
