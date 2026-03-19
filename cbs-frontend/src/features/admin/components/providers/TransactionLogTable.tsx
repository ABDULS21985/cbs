import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ProviderTransaction } from '../../api/providerApi';

interface TransactionLogTableProps {
  transactions: ProviderTransaction[];
  pageSize?: number;
}

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILURE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TIMEOUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PARTIAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function TransactionLogTable({ transactions, pageSize = 20 }: TransactionLogTableProps) {
  const [page, setPage] = useState(0);
  const total = transactions.length;
  const pages = Math.ceil(total / pageSize);
  const paged = transactions.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Operation</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Response (ms)</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map(tx => (
              <tr key={tx.id} className="hover:bg-muted/40 transition-colors" title={tx.errorMessage || undefined}>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{tx.requestTimestamp ? format(new Date(tx.requestTimestamp), 'dd MMM HH:mm:ss') : '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.transactionRef || '—'}</td>
                <td className="px-4 py-3 text-xs">{tx.operationType || '—'}</td>
                <td className={cn('px-4 py-3 text-right font-mono text-xs', tx.responseTimeMs > 300 ? 'text-amber-600 dark:text-amber-400' : '')}>
                  {tx.responseTimeMs}ms
                </td>
                <td className="px-4 py-3 font-mono text-xs">{tx.responseCode || '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[tx.responseStatus] || STATUS_BADGE.PARTIAL)}>
                    {tx.responseStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs">{tx.costCharged != null ? `₦${Number(tx.costCharged).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs">
          <span className="text-muted-foreground">Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1 rounded border hover:bg-muted disabled:opacity-40 transition-colors">Prev</button>
            <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
              className="px-3 py-1 rounded border hover:bg-muted disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
