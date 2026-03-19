import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Link2, X } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { VATransaction } from '../../api/virtualAccountApi';

interface UnmatchedItemsTableProps {
  transactions: VATransaction[];
  onMatch: (txn: VATransaction) => void;
  onWriteOff: (txn: VATransaction) => void;
}

export function UnmatchedItemsTable({ transactions, onMatch, onWriteOff }: UnmatchedItemsTableProps) {
  const unmatched = useMemo(
    () => transactions.filter((t) => t.matchStatus === 'UNMATCHED' || t.matchStatus === 'PARTIAL'),
    [transactions],
  );

  const columns = useMemo<ColumnDef<VATransaction, unknown>[]>(
    () => [
      {
        accessorKey: 'transactionDate',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDate(row.original.transactionDate)}</span>
        ),
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground max-w-[200px] block truncate">
            {row.original.description || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span
            className={[
              'font-mono text-sm font-medium tabular-nums',
              row.original.transactionType === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
            ].join(' ')}
          >
            {row.original.transactionType === 'CREDIT' ? '+' : '-'}
            {formatMoney(row.original.amount)}
          </span>
        ),
      },
      {
        id: 'matchStatus',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              row.original.matchStatus === 'PARTIAL'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            ].join(' ')}
          >
            {row.original.matchStatus}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMatch(row.original);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              Match Manually
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWriteOff(row.original);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
            >
              <X className="w-3 h-3" />
              Write Off
            </button>
          </div>
        ),
      },
    ],
    [onMatch, onWriteOff],
  );

  return (
    <DataTable
      columns={columns}
      data={unmatched}
      emptyMessage="No unmatched items — all transactions have been reconciled"
      pageSize={15}
    />
  );
}
