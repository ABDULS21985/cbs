import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatMoney } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { CtrReport } from '../../types/aml';

interface Props {
  data: CtrReport[];
  isLoading?: boolean;
}

const columns: ColumnDef<CtrReport>[] = [
  {
    accessorKey: 'reportDate',
    header: 'Date',
    cell: ({ getValue }) => (
      <span className="text-sm">{formatDate(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => (
      <span className="text-sm font-semibold">
        {formatMoney(row.original.totalAmount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'currency',
    header: 'Currency',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'transactionCount',
    header: 'Tx Count',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<number>().toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
  },
];

export function CtrReportTable({ data, isLoading }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyMessage="No CTR reports"
      pageSize={10}
      enableExport
      exportFilename="ctr-reports"
      enableGlobalFilter
    />
  );
}
