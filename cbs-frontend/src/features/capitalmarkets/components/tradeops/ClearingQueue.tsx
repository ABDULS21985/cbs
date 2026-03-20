import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { ClearingEntry } from '../../api/tradeOpsApi';

const priorityColors: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface ClearingQueueProps {
  data: ClearingEntry[];
  isLoading: boolean;
  onSubmitForClearing?: (entry: ClearingEntry) => void;
}

export function ClearingQueue({ data, isLoading, onSubmitForClearing }: ClearingQueueProps) {
  const columns: ColumnDef<ClearingEntry, any>[] = [
    {
      accessorKey: 'clearingRef',
      header: 'Clearing Ref',
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.clearingRef}</span>,
    },
    {
      accessorKey: 'tradeRef',
      header: 'Trade Ref',
      cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.tradeRef}</span>,
    },
    {
      accessorKey: 'instrumentCode',
      header: 'Instrument',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.instrumentCode}</span>,
    },
    {
      accessorKey: 'clearingHouse',
      header: 'Clearing House',
      cell: ({ row }) => <span className="text-sm">{row.original.clearingHouse}</span>,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[row.original.priority]}`}>
          {row.original.priority}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'submittedAt',
      header: 'Submitted',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.submittedAt ? formatDateTime(row.original.submittedAt) : '--'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'PENDING' && onSubmitForClearing ? (
          <button
            onClick={() => onSubmitForClearing(row.original)}
            className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Submit
          </button>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No clearing entries"
    />
  );
}
