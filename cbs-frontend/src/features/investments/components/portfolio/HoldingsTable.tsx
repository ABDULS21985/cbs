import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Holding {
  id: number;
  instrumentCode: string;
  instrumentName: string;
  holdingType: string;
  quantity: number;
  costPrice: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  currency: string;
  weight?: number;
}

interface Props {
  holdings: Holding[];
  isLoading?: boolean;
  currency?: string;
}

export function HoldingsTable({ holdings, isLoading, currency = 'NGN' }: Props) {
  const columns: ColumnDef<Holding, unknown>[] = [
    { accessorKey: 'instrumentName', header: 'Instrument', cell: ({ row }) => (
      <div><p className="text-sm font-medium">{row.original.instrumentName}</p><p className="text-[10px] text-muted-foreground font-mono">{row.original.instrumentCode}</p></div>
    )},
    { accessorKey: 'holdingType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.holdingType} size="sm" /> },
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.quantity.toLocaleString()}</span> },
    { accessorKey: 'costPrice', header: 'Avg Cost', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.costPrice, row.original.currency)}</span> },
    { accessorKey: 'currentPrice', header: 'Price', cell: ({ row }) => <span className="font-mono text-xs">{row.original.currentPrice ? formatMoney(row.original.currentPrice, row.original.currency) : '—'}</span> },
    { accessorKey: 'currentValue', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.currentValue ? formatMoney(row.original.currentValue, row.original.currency) : '—'}</span> },
    { id: 'pnl', header: 'P&L', cell: ({ row }) => {
      const pnl = row.original.unrealizedPnl ?? 0;
      const pct = row.original.unrealizedPnlPct ?? 0;
      return (
        <span className={cn('font-mono text-xs font-medium', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
          {pnl >= 0 ? '+' : ''}{formatMoney(pnl, row.original.currency)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
        </span>
      );
    }},
    { accessorKey: 'weight', header: 'Weight', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.weight ? formatPercent(row.original.weight) : '—'}</span> },
  ];

  return <DataTable columns={columns} data={holdings} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="holdings" emptyMessage="No holdings in this portfolio" />;
}
