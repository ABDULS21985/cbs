import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, Landmark, TrendingDown, TrendingUp } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionSummary } from '../api/transactionApi';

interface TransactionSummaryBarProps {
  summary: TransactionSummary;
  previousSummary?: TransactionSummary | null;
  comparisonPeriodLabel?: string | null;
  transactions: Transaction[];
  isLoading?: boolean;
  onHighlightLargest?: (transactionId: string) => void;
}

function useAnimatedNumber(target: number, duration = 450) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const start = performance.now();
    const initialValue = value;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const nextValue = initialValue + (target - initialValue) * progress;
      setValue(nextValue);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

function calcPercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getTransactionAmount(transaction: Transaction): number {
  return transaction.debitAmount ?? transaction.creditAmount ?? 0;
}

export function TransactionSummaryBar({
  summary,
  previousSummary,
  comparisonPeriodLabel,
  transactions,
  isLoading = false,
  onHighlightLargest,
}: TransactionSummaryBarProps) {
  const animatedResults = useAnimatedNumber(summary.totalResults);
  const animatedDebit = useAnimatedNumber(summary.totalDebit);
  const animatedCredit = useAnimatedNumber(summary.totalCredit);
  const animatedNet = useAnimatedNumber(summary.netAmount);

  const derivedMetrics = useMemo(() => {
    const amounts = transactions.map(getTransactionAmount).filter((value) => value > 0);
    const avgValue = amounts.length > 0
      ? amounts.reduce((total, value) => total + value, 0) / amounts.length
      : 0;
    const largestTransaction = transactions.reduce<Transaction | null>((largest, transaction) => {
      if (!largest) return transaction;
      return getTransactionAmount(transaction) > getTransactionAmount(largest) ? transaction : largest;
    }, null);

    const channelCounts = transactions.reduce<Record<string, number>>((counts, transaction) => {
      counts[transaction.channel] = (counts[transaction.channel] ?? 0) + 1;
      return counts;
    }, {});
    const mostActiveChannel = Object.entries(channelCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? '—';

    return {
      avgValue,
      largestTransaction,
      mostActiveChannel,
    };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-xl border bg-card p-4">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-3 h-7 w-28 rounded bg-muted" />
            <div className="mt-3 h-3 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const comparisonValues = {
    results: calcPercentageChange(summary.totalResults, previousSummary?.totalResults ?? 0),
    debit: calcPercentageChange(summary.totalDebit, previousSummary?.totalDebit ?? 0),
    credit: calcPercentageChange(summary.totalCredit, previousSummary?.totalCredit ?? 0),
    net: calcPercentageChange(summary.netAmount, previousSummary?.netAmount ?? 0),
  };

  const cards = [
    {
      label: 'Results',
      value: Math.round(animatedResults).toLocaleString(),
      icon: BarChart3,
      comparison: comparisonValues.results,
    },
    {
      label: 'Total Debit',
      value: formatMoney(animatedDebit),
      icon: TrendingDown,
      tone: 'danger' as const,
      comparison: comparisonValues.debit,
    },
    {
      label: 'Total Credit',
      value: formatMoney(animatedCredit),
      icon: TrendingUp,
      tone: 'success' as const,
      comparison: comparisonValues.credit,
    },
    {
      label: 'Net',
      value: formatMoney(animatedNet),
      icon: ArrowUpRight,
      tone: summary.netAmount >= 0 ? 'success' as const : 'danger' as const,
      comparison: comparisonValues.net,
    },
    {
      label: 'Avg Transaction Value',
      value: formatMoney(derivedMetrics.avgValue),
      icon: Landmark,
    },
    {
      label: 'Largest Transaction',
      value: derivedMetrics.largestTransaction ? formatMoney(getTransactionAmount(derivedMetrics.largestTransaction)) : '—',
      icon: ArrowUpRight,
      actionLabel: derivedMetrics.largestTransaction ? 'Highlight row' : undefined,
      onClick:
        derivedMetrics.largestTransaction && onHighlightLargest
          ? () => onHighlightLargest(String(derivedMetrics.largestTransaction!.id))
          : undefined,
    },
    {
      label: 'Most Active Channel',
      value: derivedMetrics.mostActiveChannel,
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-2">
      {comparisonPeriodLabel && (
        <p className="text-xs text-muted-foreground">
          Period comparison against {comparisonPeriodLabel}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const comparison = card.comparison;
          const comparisonText = comparison === null || comparison === undefined
            ? null
            : `vs previous period ${comparison >= 0 ? '▲' : '▼'} ${Math.abs(comparison).toFixed(1)}%`;

          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              disabled={!card.onClick}
              className={cn(
                'rounded-xl border bg-card p-4 text-left transition-colors',
                card.onClick ? 'hover:border-primary/40 hover:bg-primary/5' : 'cursor-default',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p
                    className={cn(
                      'mt-3 font-mono text-2xl font-semibold',
                      card.tone === 'success' && 'text-green-600 dark:text-green-400',
                      card.tone === 'danger' && 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {card.value}
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              {comparisonText && (
                <p className="mt-3 text-xs text-muted-foreground">{comparisonText}</p>
              )}
              {card.actionLabel && (
                <p className="mt-3 text-xs font-medium text-primary">{card.actionLabel}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
