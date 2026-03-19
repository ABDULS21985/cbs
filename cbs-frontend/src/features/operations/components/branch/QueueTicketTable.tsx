import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { QueueTicket } from '../../api/branchOpsApi';

interface QueueTicketTableProps {
  tickets: QueueTicket[];
  isLoading: boolean;
}

const priorityStyles: Record<QueueTicket['priority'], string> = {
  NORMAL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PRIORITY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const columns: ColumnDef<QueueTicket, unknown>[] = [
  {
    accessorKey: 'ticketNumber',
    header: 'Ticket #',
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-primary">{row.original.ticketNumber}</span>
    ),
  },
  {
    accessorKey: 'serviceType',
    header: 'Service Type',
    cell: ({ row }) => <span className="text-sm">{row.original.serviceType}</span>,
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => (
      <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', priorityStyles[row.original.priority])}>
        {row.original.priority}
      </span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.customerName ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'issuedAt',
    header: 'Issued',
    cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.issuedAt)}</span>,
  },
  {
    accessorKey: 'calledAt',
    header: 'Called',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.calledAt ? formatDateTime(row.original.calledAt) : '—'}</span>
    ),
  },
  {
    accessorKey: 'servedAt',
    header: 'Served',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.servedAt ? formatDateTime(row.original.servedAt) : '—'}</span>
    ),
  },
  {
    accessorKey: 'waitMinutes',
    header: 'Wait',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.waitMinutes != null ? `${row.original.waitMinutes} min` : '—'}</span>
    ),
  },
  {
    accessorKey: 'serviceMinutes',
    header: 'Service Time',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.serviceMinutes != null ? `${row.original.serviceMinutes} min` : '—'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function QueueTicketTable({ tickets, isLoading }: QueueTicketTableProps) {
  return (
    <DataTable
      columns={columns}
      data={tickets}
      isLoading={isLoading}
      enableGlobalFilter
      pageSize={15}
      emptyMessage="No tickets found"
    />
  );
}
