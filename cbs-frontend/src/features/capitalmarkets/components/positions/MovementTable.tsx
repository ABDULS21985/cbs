import { cn } from '@/lib/utils';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { SecuritiesMovement } from '../../api/secPositionApi';

const typeColors: Record<string, string> = {
  BUY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SELL: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TRANSFER: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CORPORATE_ACTION: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const columns: ColumnDef<SecuritiesMovement, any>[] = [
  {
    accessorKey: 'movementDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.movementDate)}</span>,
  },
  {
    accessorKey: 'instrumentCode',
    header: 'Instrument',
    cell: ({ row }) => (
      <div>
        <span className="text-sm font-medium">{row.original.instrumentCode}</span>
        {row.original.instrumentName && (
          <span className="block text-xs text-muted-foreground">{row.original.instrumentName}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'movementType',
    header: 'Type',
    cell: ({ row }) => (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', typeColors[row.original.movementType])}>
        {row.original.movementType.replace('_', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Qty',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.quantity.toLocaleString()}</span>,
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.price.toFixed(4)}</span>,
  },
  {
    accessorKey: 'settlementAmount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">
        {formatMoney(row.original.settlementAmount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'counterpartyName',
    header: 'Counterparty',
    cell: ({ row }) => <span className="text-sm">{row.original.counterpartyName}</span>,
  },
  {
    accessorKey: 'portfolioCode',
    header: 'Portfolio',
    cell: ({ row }) => <span className="text-xs font-mono">{row.original.portfolioCode}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

interface MovementTableProps {
  data: SecuritiesMovement[];
  isLoading: boolean;
}

export function MovementTable({ data, isLoading }: MovementTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No securities movements"
    />
  );
}
