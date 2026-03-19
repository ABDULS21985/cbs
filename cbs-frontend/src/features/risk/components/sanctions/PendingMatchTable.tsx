import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { SanctionsMatch, MatchStatus } from '../../types/sanctions';
import { MatchScoreBadge } from './MatchScoreBadge';

interface Props {
  data: SanctionsMatch[];
  isLoading: boolean;
  onRowClick: (match: SanctionsMatch) => void;
}

const statusConfig: Record<MatchStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  CONFIRMED_HIT: {
    label: 'Confirmed Hit',
    classes: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  FALSE_POSITIVE: {
    label: 'False Positive',
    classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  NEEDS_MORE_INFO: {
    label: 'Needs More Info',
    classes: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

export function PendingMatchTable({ data, isLoading, onRowClick }: Props) {
  const columns = useMemo<ColumnDef<SanctionsMatch>[]>(
    () => [
      {
        accessorKey: 'matchNumber',
        header: 'Match #',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.matchNumber}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer / Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-sm">{row.original.customerName}</div>
            <div className="text-xs text-muted-foreground">ID: {row.original.customerId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'matchType',
        header: 'Match Type',
        cell: ({ row }) => (
          <span className="text-xs font-medium uppercase tracking-wide">{row.original.matchType}</span>
        ),
      },
      {
        accessorKey: 'watchlist',
        header: 'Watchlist',
        cell: ({ row }) => (
          <span className="text-xs font-mono">{row.original.watchlist}</span>
        ),
      },
      {
        accessorKey: 'matchScore',
        header: 'Score',
        cell: ({ row }) => <MatchScoreBadge score={row.original.matchScore} />,
      },
      {
        accessorKey: 'entityMatched',
        header: 'Entity Matched',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.entityMatched}</span>
        ),
      },
      {
        accessorKey: 'screenedAt',
        header: 'Screened At',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.screenedAt)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const config = statusConfig[row.original.status];
          return (
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.classes)}>
              {config.label}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableGlobalFilter
      enableExport
      exportFilename="sanctions-matches"
      emptyMessage="No sanctions matches found"
      pageSize={15}
    />
  );
}
