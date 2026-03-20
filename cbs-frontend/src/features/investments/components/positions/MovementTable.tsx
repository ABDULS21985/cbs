import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { SecMovement } from '../../api/secPositionApi';

const MOVEMENT_BADGE: Record<string, string> = {
  BUY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SELL: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TRANSFER: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DIVIDEND: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CORPORATE_ACTION: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const columns: ColumnDef<SecMovement, unknown>[] = [
  {
    accessorKey: 'movementDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.movementDate)}</span>,
  },
  {
    accessorKey: 'instrumentName',
    header: 'Instrument',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.instrumentName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.original.instrumentCode}</p>
      </div>
    ),
  },
  {
    accessorKey: 'movementType',
    header: 'Type',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MOVEMENT_BADGE[row.original.movementType] ?? 'bg-muted text-muted-foreground'}`}>
        {row.original.movementType}
      </span>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.quantity.toLocaleString()}</span>,
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.price, row.original.currency)}</span>,
  },
  {
    accessorKey: 'settlementAmount',
    header: 'Amount',
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.settlementAmount, row.original.currency)}</span>,
  },
  {
    accessorKey: 'counterpartyName',
    header: 'Counterparty',
    cell: ({ row }) => <span className="text-sm">{row.original.counterpartyName || '—'}</span>,
  },
  {
    accessorKey: 'portfolioCode',
    header: 'Portfolio',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.portfolioCode}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.original.status === 'SETTLED' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
        {row.original.status}
      </span>
    ),
  },
];

interface Props {
  movements: SecMovement[];
  isLoading?: boolean;
}

export function MovementTable({ movements, isLoading }: Props) {
  return (
    <DataTable
      columns={columns}
      data={movements}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No movements found"
    />
  );
}
