import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { qrApi, type QrTransaction } from '../../api/qrApi';

const columns: ColumnDef<QrTransaction>[] = [
  {
    accessorKey: 'qrRef',
    header: 'QR Ref',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.qrRef}</span>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.date)}</span>
    ),
  },
  {
    accessorKey: 'payerName',
    header: 'Payer',
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.payerName}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'settlement',
    header: 'Settlement',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.settlement ? formatDateTime(row.original.settlement) : '—'}
      </span>
    ),
  },
];

export function QrTransactionHistory() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['qr-transactions'],
    queryFn: () => qrApi.getQrTransactions(),
  });

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      enableColumnVisibility
      enableExport
      exportFilename="qr-transactions"
      emptyMessage="No QR transactions found"
    />
  );
}
