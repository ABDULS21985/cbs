import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney, formatDate } from '@/lib/formatters';
import { useCreditWatchList } from '../../hooks/useCreditRisk';
import type { CreditWatchItem } from '../../types/creditRisk';

const STATUS_STYLES: Record<CreditWatchItem['status'], string> = {
  WATCH: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ESCALATED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RESOLVED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const TODAY = new Date();

const columns: ColumnDef<CreditWatchItem, any>[] = [
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.customerName}</p>
        <p className="text-xs text-muted-foreground">ID: {row.original.customerId}</p>
      </div>
    ),
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => (
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted">
        {row.original.rating}
      </span>
    ),
  },
  {
    accessorKey: 'exposure',
    header: 'Exposure',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatMoney(row.original.exposure)}</span>
    ),
  },
  {
    accessorKey: 'addedDate',
    header: 'Added Date',
    cell: ({ row }) => (
      <span className="text-xs">{formatDate(row.original.addedDate)}</span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={row.original.reason}>
        {row.original.reason}
      </span>
    ),
  },
  {
    accessorKey: 'reviewDate',
    header: 'Review Date',
    cell: ({ row }) => {
      const reviewDate = new Date(row.original.reviewDate);
      const isOverdue = reviewDate < TODAY && row.original.status !== 'RESOLVED';
      return (
        <span className={cn('text-xs font-mono', isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : '')}>
          {formatDate(row.original.reviewDate)}
          {isOverdue && <span className="ml-1 text-red-500">(Overdue)</span>}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[row.original.status])}>
        {row.original.status}
      </span>
    ),
  },
];

export function WatchListTable() {
  const { data: watchList = [], isLoading } = useCreditWatchList();

  const stats = useMemo(() => ({
    watch: watchList.filter(i => i.status === 'WATCH').length,
    escalated: watchList.filter(i => i.status === 'ESCALATED').length,
    overdue: watchList.filter(i => {
      const d = new Date(i.reviewDate);
      return d < TODAY && i.status !== 'RESOLVED';
    }).length,
  }), [watchList]);

  return (
    <div className="space-y-4 p-4">
      {watchList.length > 0 && (
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {stats.watch} Watch
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              {stats.escalated} Escalated
            </span>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20">
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                {stats.overdue} Overdue Review
              </span>
            </div>
          )}
        </div>
      )}
      <DataTable
        columns={columns}
        data={watchList}
        isLoading={isLoading}
        emptyMessage="No watch list items"
        pageSize={15}
        enableExport
        exportFilename="credit-watch-list"
        enableGlobalFilter
      />
    </div>
  );
}
