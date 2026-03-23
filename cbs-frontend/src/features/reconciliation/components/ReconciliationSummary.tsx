import { CheckCircle2, XCircle, AlertCircle, Scale, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import type { ReconciliationSession } from '../api/reconciliationApi';

interface ReconciliationSummaryProps {
  session: ReconciliationSession;
}

export function ReconciliationSummary({ session }: ReconciliationSummaryProps) {
  const totalOurEntries = session.ourEntries.length;
  const totalBankEntries = session.bankEntries.length;
  const totalItems = totalOurEntries;
  const matchedPct = totalItems > 0 ? Math.round((session.matchedCount / totalItems) * 100) : 0;
  const isBalanced = session.difference === 0;

  return (
    <div className="surface-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reconciliation Summary</h2>
        <span className={cn(
          'text-xs font-medium px-2.5 py-0.5 rounded-full',
          session.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          session.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        )}>
          {session.status.replace('_', ' ')}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Balance Comparison */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">Our Books Balance</p>
            <p className="text-lg font-semibold font-mono tabular-nums">{formatMoney(session.ourBalance)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-1">Bank Statement Balance</p>
            <p className="text-lg font-semibold font-mono tabular-nums">{formatMoney(session.bankBalance)}</p>
          </div>
          <div className={cn('rounded-lg p-4', isBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
            <div className="flex items-center gap-1.5 mb-1">
              {isBalanced ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              )}
              <p className="text-xs text-muted-foreground">Difference</p>
            </div>
            <p className={cn(
              'text-lg font-semibold font-mono tabular-nums',
              isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}>
              {isBalanced ? 'Nil' : formatMoney(Math.abs(session.difference))}
            </p>
          </div>
        </div>

        {/* Match Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Match Progress</p>
            <p className="text-xs font-semibold">{matchedPct}% matched</p>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                matchedPct === 100 ? 'bg-green-500' : matchedPct >= 75 ? 'bg-amber-500' : 'bg-red-500',
              )}
              style={{ width: `${matchedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">{session.matchedCount} of {totalOurEntries} items matched</p>
            <p className="text-xs text-muted-foreground">{session.ourUnmatchedCount + session.bankUnmatchedCount} breaks outstanding</p>
          </div>
        </div>

        {/* Item Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{session.matchedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Matched</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">
                {session.ourEntries.filter((e) => e.status === 'PARTIAL').length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Partial</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{session.ourUnmatchedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ours Unmatched</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{session.bankUnmatchedCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Bank Unmatched</p>
            </div>
          </div>
        </div>

        {/* Entry Counts Footnote */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>Our entries: {totalOurEntries} &nbsp;·&nbsp; Bank entries: {totalBankEntries}</span>
          <span>Recon date: {session.reconciliationDate}</span>
        </div>
      </div>
    </div>
  );
}
