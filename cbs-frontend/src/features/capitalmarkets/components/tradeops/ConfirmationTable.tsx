import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { TradeConfirmation } from '../../api/tradeOpsApi';

const matchStatusColors: Record<string, string> = {
  MATCHED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ALLEGED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UNMATCHED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const columns: ColumnDef<TradeConfirmation, any>[] = [
  {
    accessorKey: 'tradeRef',
    header: 'Trade Ref',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.tradeRef}</span>,
  },
  {
    accessorKey: 'tradeDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.tradeDate)}</span>,
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
    accessorKey: 'counterpartyName',
    header: 'Counterparty',
    cell: ({ row }) => <span className="text-sm">{row.original.counterpartyName}</span>,
  },
  {
    accessorKey: 'side',
    header: 'Side',
    cell: ({ row }) => (
      <span className={`text-xs font-semibold ${row.original.side === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
        {row.original.side}
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
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.amount, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'matchStatus',
    header: 'Match',
    cell: ({ row }) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${matchStatusColors[row.original.matchStatus] || ''}`}>
        {row.original.matchStatus === 'MATCHED' ? '✅' : row.original.matchStatus === 'ALLEGED' ? '⚠️' : '❌'}{' '}
        {row.original.matchStatus}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

interface ConfirmationTableProps {
  data: TradeConfirmation[];
  isLoading: boolean;
  onRowClick?: (row: TradeConfirmation) => void;
}

export function ConfirmationTable({ data, isLoading, onRowClick }: ConfirmationTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      onRowClick={onRowClick}
      emptyMessage="No trade confirmations found"
    />
  );
}
