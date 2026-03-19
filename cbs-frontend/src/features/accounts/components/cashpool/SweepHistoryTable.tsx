import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import type { SweepTransaction } from '../../api/cashPoolApi';

interface SweepHistoryTableProps {
  sweeps: SweepTransaction[];
}

const SWEEP_TYPE_COLORS: Record<string, string> = {
  ZERO_BALANCE: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TARGET_BALANCE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  THRESHOLD: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function SweepHistoryTable({ sweeps }: SweepHistoryTableProps) {
  const columns = useMemo<ColumnDef<SweepTransaction, unknown>[]>(
    () => [
      {
        accessorKey: 'valueDate',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{row.original.valueDate}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Time',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'fromAccountId',
        header: 'From Account',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.fromAccountId}</span>
        ),
      },
      {
        accessorKey: 'toAccountId',
        header: 'To Account',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.toAccountId}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatMoney(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'sweepDirection',
        header: 'Direction',
        cell: ({ row }) => (
          <span className="text-xs font-medium">{row.original.sweepDirection}</span>
        ),
      },
      {
        accessorKey: 'sweepType',
        header: 'Type',
        cell: ({ row }) => (
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              SWEEP_TYPE_COLORS[row.original.sweepType] || 'bg-gray-100 text-gray-600',
            ].join(' ')}
          >
            {row.original.sweepType.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={sweeps}
      enableGlobalFilter
      emptyMessage="No sweep transactions recorded"
      pageSize={15}
    />
  );
}
