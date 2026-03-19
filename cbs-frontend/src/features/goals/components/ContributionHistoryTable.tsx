import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/formatters';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { GoalContribution } from '../api/goalApi';

interface ContributionHistoryTableProps {
  contributions: GoalContribution[];
  isLoading?: boolean;
}

export function ContributionHistoryTable({ contributions, isLoading }: ContributionHistoryTableProps) {
  const columns = useMemo<ColumnDef<GoalContribution, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-sm">{formatDate(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium tabular-nums text-green-600 dark:text-green-400">
            +{formatMoney(getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue() as string;
          return (
            <span
              className={cn(
                'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                type === 'AUTO'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
              )}
            >
              {type === 'AUTO' ? 'Auto-Debit' : 'Manual'}
            </span>
          );
        },
      },
      {
        accessorKey: 'runningTotal',
        header: 'Running Total',
        cell: ({ getValue }) => (
          <span className="text-sm font-semibold tabular-nums">{formatMoney(getValue() as number)}</span>
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
      emptyMessage="No contributions yet"
    />
  );
}
