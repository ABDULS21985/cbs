import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { SecPosition } from '../../api/secPositionApi';

const columns: ColumnDef<SecPosition, unknown>[] = [
  {
    accessorKey: 'instrumentName',
    header: 'Instrument',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.instrumentName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.original.instrumentCode} · {row.original.isin}</p>
      </div>
    ),
  },
  {
    accessorKey: 'instrumentType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.instrumentType} />,
  },
  {
    accessorKey: 'portfolioCode',
    header: 'Portfolio',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.portfolioCode}</span>,
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.quantity.toLocaleString()}</span>,
  },
  {
    accessorKey: 'avgCost',
    header: 'Avg Cost',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.avgCost, row.original.currency)}</span>,
  },
  {
    accessorKey: 'marketPrice',
    header: 'Market Price',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.marketPrice, row.original.currency)}</span>,
  },
  {
    accessorKey: 'marketValue',
    header: 'Market Value',
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.marketValue, row.original.currency)}</span>,
  },
  {
    accessorKey: 'unrealizedPnl',
    header: 'P&L',
    cell: ({ row }) => (
      <span className={cn('font-mono text-sm font-medium', row.original.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
        {formatMoney(row.original.unrealizedPnl, row.original.currency)}
        <span className="text-xs ml-1">({row.original.unrealizedPnlPct >= 0 ? '+' : ''}{row.original.unrealizedPnlPct.toFixed(2)}%)</span>
      </span>
    ),
  },
];

interface Props {
  positions: SecPosition[];
  isLoading?: boolean;
}

export function PositionTable({ positions, isLoading }: Props) {
  return (
    <DataTable
      columns={columns}
      data={positions}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No securities positions found"
    />
  );
}
