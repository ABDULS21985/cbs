import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
import type { RegulatoryReturn } from '../../api/regulatoryApi';

const columns: ColumnDef<RegulatoryReturn, any>[] = [
  { accessorKey: 'returnCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.returnCode}</span> },
  { accessorKey: 'name', header: 'Return Name' },
  { accessorKey: 'regulatoryBody', header: 'Regulator', cell: ({ row }) => <span className="text-xs font-semibold">{row.original.regulatoryBody}</span> },
  { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className="text-xs">{row.original.frequency}</span> },
  { accessorKey: 'period', header: 'Period' },
  { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => formatDate(row.original.dueDate) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  { accessorKey: 'validationsPassed', header: 'Validations', cell: ({ row }) => row.original.validationsTotal ? <span className="text-xs font-mono">{row.original.validationsPassed}/{row.original.validationsTotal}</span> : '—' },
];

interface Props { data: RegulatoryReturn[]; isLoading?: boolean; onRowClick?: (row: RegulatoryReturn) => void }

export function ReturnTable({ data, isLoading, onRowClick }: Props) {
  return <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={onRowClick} enableGlobalFilter enableExport exportFilename="regulatory-returns" />;
}
