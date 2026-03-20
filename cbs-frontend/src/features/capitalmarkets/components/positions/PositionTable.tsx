import { cn } from '@/lib/utils';
import { DataTable } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { SecuritiesPosition } from '../../api/secPositionApi';

const columns: ColumnDef<SecuritiesPosition, any>[] = [
  {
    accessorKey: 'instrumentCode',
    header: 'Instrument',
    cell: ({ row }) => (
      <div>
        <span className="text-sm font-medium">{row.original.instrumentCode}</span>
        <span className="block text-xs text-muted-foreground">{row.original.instrumentName}</span>
      </div>
    ),
  },
  {
    accessorKey: 'isin',
    header: 'ISIN',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin}</span>,
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.quantity.toLocaleString()}</span>,
  },
  {
    accessorKey: 'avgCost',
    header: 'Avg Cost',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.avgCost.toFixed(4)}</span>,
  },
  {
    accessorKey: 'marketPrice',
    header: 'Market Price',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.marketPrice.toFixed(4)}</span>,
  },
  {
    accessorKey: 'marketValue',
    header: 'Market Value',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.marketValue, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'unrealizedPnl',
    header: 'P&L',
    cell: ({ row }) => (
      <span className={cn('text-sm tabular-nums font-medium', row.original.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
        {row.original.unrealizedPnl >= 0 ? '+' : ''}{formatMoney(row.original.unrealizedPnl, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'unrealizedPnlPct',
    header: 'P&L %',
    cell: ({ row }) => (
      <span className={cn('text-sm tabular-nums font-medium', row.original.unrealizedPnlPct >= 0 ? 'text-green-600' : 'text-red-600')}>
        {row.original.unrealizedPnlPct >= 0 ? '+' : ''}{row.original.unrealizedPnlPct.toFixed(2)}%
      </span>
    ),
  },
];

interface PositionTableProps {
  data: SecuritiesPosition[];
  isLoading: boolean;
}

export function PositionTable({ data, isLoading }: PositionTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No securities positions"
    />
  );
}
