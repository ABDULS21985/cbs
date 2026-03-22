import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatRelative } from '@/lib/formatters';
import { CasePriorityBadge } from './CasePriorityBadge';
import { SlaBadge } from './SlaBadge';
import type { CustomerCase } from '../api/caseApi';

const columns: ColumnDef<CustomerCase, any>[] = [
  { accessorKey: 'caseNumber', header: 'Case #', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.caseNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'caseType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.caseType.replace(/_/g, ' ')}</span> },
  { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <CasePriorityBadge priority={row.original.priority} /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  { accessorKey: 'slaDueAt', header: 'SLA', cell: ({ row }) => <SlaBadge deadline={row.original.slaDueAt} breached={row.original.slaBreached} /> },
  { accessorKey: 'assignedToName', header: 'Assigned', cell: ({ row }) => row.original.assignedToName || row.original.assignedTo || <span className="text-muted-foreground text-xs">Unassigned</span> },
  { accessorKey: 'openedAt', header: 'Opened', cell: ({ row }) => formatDate(row.original.openedAt || row.original.createdAt) },
  { accessorKey: 'age', header: 'Age', cell: ({ row }) => formatRelative(row.original.openedAt || row.original.createdAt) },
];

interface Props {
  data: CustomerCase[];
  isLoading?: boolean;
  onRowClick?: (row: CustomerCase) => void;
}

export function CaseTable({ data, isLoading, onRowClick }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableGlobalFilter
      enableExport
      exportFilename="cases"
      emptyMessage="No cases found"
    />
  );
}
