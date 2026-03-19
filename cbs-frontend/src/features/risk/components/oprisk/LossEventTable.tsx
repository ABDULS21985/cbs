import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { LossEvent } from '../../api/opriskApi';

const columns: ColumnDef<LossEvent, any>[] = [
  { accessorKey: 'eventNumber', header: 'Event #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.eventNumber}</span> },
  { accessorKey: 'eventDate', header: 'Date', cell: ({ row }) => formatDate(row.original.eventDate) },
  { accessorKey: 'category', header: 'Category', cell: ({ row }) => <span className="text-xs">{row.original.category}</span> },
  { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-xs truncate max-w-[200px] block">{row.original.description}</span> },
  { accessorKey: 'grossLoss', header: 'Gross Loss', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{formatMoney(row.original.grossLoss, row.original.currency)}</span> },
  { accessorKey: 'recovery', header: 'Recovery', cell: ({ row }) => <span className="font-mono text-xs text-green-600">{formatMoney(row.original.recovery, row.original.currency)}</span> },
  { accessorKey: 'netLoss', header: 'Net Loss', cell: ({ row }) => <span className="font-mono text-xs font-semibold">{formatMoney(row.original.netLoss, row.original.currency)}</span> },
  { accessorKey: 'businessUnit', header: 'BU' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

interface Props { data: LossEvent[]; isLoading?: boolean; onRowClick?: (row: LossEvent) => void }

export function LossEventTable({ data, isLoading, onRowClick }: Props) {
  return <DataTable columns={columns} data={data} isLoading={isLoading} onRowClick={onRowClick} enableGlobalFilter enableExport exportFilename="loss-events" />;
}
