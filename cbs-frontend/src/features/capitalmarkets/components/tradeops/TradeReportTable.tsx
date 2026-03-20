import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { TradeReport } from '../../api/tradeOpsApi';

const columns: ColumnDef<TradeReport, any>[] = [
  {
    accessorKey: 'reportRef',
    header: 'Report Ref',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.reportRef}</span>,
  },
  {
    accessorKey: 'reportType',
    header: 'Type',
    cell: ({ row }) => <span className="text-sm">{row.original.reportType}</span>,
  },
  {
    accessorKey: 'reportDate',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.reportDate)}</span>,
  },
  {
    accessorKey: 'tradeCount',
    header: 'Trades',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.tradeCount.toLocaleString()}</span>,
  },
  {
    accessorKey: 'totalVolume',
    header: 'Volume',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.totalVolume.toLocaleString()}</span>,
  },
  {
    accessorKey: 'totalValue',
    header: 'Value',
    cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.totalValue)}</span>,
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
];

interface TradeReportTableProps {
  data: TradeReport[];
  isLoading: boolean;
}

export function TradeReportTable({ data, isLoading }: TradeReportTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No trade reports"
    />
  );
}
