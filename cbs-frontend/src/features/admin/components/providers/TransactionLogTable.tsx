import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ProviderTransaction } from '../../api/providerApi';

interface TransactionLogTableProps {
  transactions: ProviderTransaction[];
  pageSize?: number;
}

type TxStatus = 'SUCCESS' | 'ERROR' | 'TIMEOUT';

const STATUS_BADGE: Record<TxStatus, string> = {
  SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TIMEOUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function responseCodeColor(code: string): string {
  const n = parseInt(code);
  if (n >= 200 && n < 300) return 'text-green-600 dark:text-green-400';
  if (n >= 400 && n < 500) return 'text-amber-600 dark:text-amber-400';
  if (n >= 500) return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

function latencyColor(ms: number): string {
  if (ms < 100) return 'text-green-600 dark:text-green-400';
  if (ms <= 300) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function TransactionLogTable({ transactions, pageSize = 20 }: TransactionLogTableProps) {
  const [page, setPage] = useState(0);
  const [tooltipId, setTooltipId] = useState<string | null>(null);

  const totalPages = Math.ceil(transactions.length / pageSize);
  const paged = transactions.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Endpoint</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Response Code</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Latency</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map(txn => (
              <tr
                key={txn.id}
                className={cn(
                  'transition-colors',
                  txn.status !== 'SUCCESS' ? 'hover:bg-red-50/30 dark:hover:bg-red-900/10' : 'hover:bg-muted/40',
                )}
              >
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(txn.timestamp), 'MMM dd, HH:mm:ss')}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{txn.endpoint}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{txn.method}</span>
                </td>
                <td className={cn('px-4 py-3 font-mono font-semibold text-xs', responseCodeColor(txn.responseCode))}>
                  {txn.responseCode}
                </td>
                <td className={cn('px-4 py-3 text-right font-semibold text-xs', latencyColor(txn.latencyMs))}>
                  {txn.latencyMs}ms
                </td>
                <td className="px-4 py-3">
                  <div className="relative inline-flex items-center gap-2">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[txn.status])}>
                      {txn.status}
                    </span>
                    {txn.errorMessage && (
                      <span
                        className="text-muted-foreground cursor-help relative"
                        onMouseEnter={() => setTooltipId(txn.id)}
                        onMouseLeave={() => setTooltipId(null)}
                      >
                        <span className="text-xs border border-border rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
                        {tooltipId === txn.id && (
                          <div className="absolute left-5 bottom-0 z-50 bg-popover border border-border rounded-md shadow-lg p-2 text-xs max-w-48 whitespace-normal">
                            {txn.errorMessage}
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, transactions.length)} of {transactions.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
