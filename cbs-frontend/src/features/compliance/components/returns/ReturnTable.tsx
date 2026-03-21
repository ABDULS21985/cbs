import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
import type { RegulatoryReturn } from '../../api/regulatoryApi';

const columns: ColumnDef<RegulatoryReturn, unknown>[] = [
  {
    accessorKey: 'reportCode',
    header: 'Code',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.reportCode}</span>,
  },
  { accessorKey: 'reportName', header: 'Return Name' },
  {
    accessorKey: 'regulator',
    header: 'Regulator',
    cell: ({ row }) => <span className="text-xs font-semibold">{row.original.regulator}</span>,
  },
  {
    accessorKey: 'reportType',
    header: 'Type',
    cell: ({ row }) => <span className="text-xs">{row.original.reportType}</span>,
  },
  { accessorKey: 'reportingPeriod', header: 'Period' },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'submissionReference',
    header: 'Ref',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.submissionReference || '—'}</span>
    ),
  },
];

interface Props { data: RegulatoryReturn[]; isLoading?: boolean; onRowClick?: (row: RegulatoryReturn) => void }

export function ReturnTable({ data, isLoading, onRowClick }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableGlobalFilter
      enableExport
      exportFilename="regulatory-returns"
    />
  );
}
