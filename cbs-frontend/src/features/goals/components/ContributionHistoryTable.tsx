import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { GoalTransaction } from '../api/goalApi';

interface ContributionHistoryTableProps {
  contributions: GoalTransaction[];
  isLoading?: boolean;
}

const txnTypeStyles: Record<string, { label: string; color: string }> = {
  DEPOSIT: { label: 'Deposit', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  INTEREST: { label: 'Interest', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PENALTY: { label: 'Penalty', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  REVERSAL: { label: 'Reversal', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export function ContributionHistoryTable({ contributions, isLoading }: ContributionHistoryTableProps) {
  const columns = useMemo<ColumnDef<GoalTransaction, unknown>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatDate(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'transactionType',
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue() as string;
          const style = txnTypeStyles[type] ?? txnTypeStyles.DEPOSIT;
          return (
            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', style.color)}>
              {style.label}
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => {
          const isCredit = row.original.transactionType === 'DEPOSIT' || row.original.transactionType === 'INTEREST';
          return (
            <span className={cn('text-sm font-medium tabular-nums', isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {isCredit ? '+' : '-'}{formatMoney(row.original.amount)}
            </span>
          );
        },
      },
      {
        accessorKey: 'narration',
        header: 'Narration',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span>
        ),
      },
      {
        accessorKey: 'runningBalance',
        header: 'Balance',
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold tabular-nums">{formatMoney(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'transactionRef',
        header: 'Reference',
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-muted-foreground">{(getValue() as string) || '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={contributions}
      isLoading={isLoading}
      enableGlobalFilter
      pageSize={10}
      emptyMessage="No transactions yet"
    />
  );
}
