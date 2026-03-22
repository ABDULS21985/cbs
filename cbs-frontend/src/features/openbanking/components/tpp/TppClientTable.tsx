import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { TppClient, TppClientType } from '../../api/openBankingApi';

const CLIENT_TYPE_STYLES: Record<TppClientType, string> = {
  TPP_AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TPP_PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TPP_BOTH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  TPP_CBPII: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  INTERNAL: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  PARTNER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SANDBOX: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const CLIENT_TYPE_LABEL: Record<TppClientType, string> = {
  TPP_AISP: 'AISP',
  TPP_PISP: 'PISP',
  TPP_BOTH: 'BOTH',
  TPP_CBPII: 'CBPII',
  INTERNAL: 'Internal',
  PARTNER: 'Partner',
  SANDBOX: 'Sandbox',
};

interface TppClientTableProps {
  clients: TppClient[];
  isLoading?: boolean;
  onRowClick?: (client: TppClient) => void;
}

const columns: ColumnDef<TppClient, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-sm">{row.original.name}</div>
        <code className="text-xs text-muted-foreground font-mono">{row.original.clientId}</code>
      </div>
    ),
  },
  {
    accessorKey: 'clientType',
    header: 'Type',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          CLIENT_TYPE_STYLES[row.original.clientType],
        )}
      >
        {CLIENT_TYPE_LABEL[row.original.clientType]}
      </span>
    ),
  },
  {
    accessorKey: 'scopes',
    header: 'Scopes',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.scopes.map((s) => (
          <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {s}
          </span>
        ))}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot size="sm" />,
  },
  {
    accessorKey: 'registeredAt',
    header: 'Registered',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.registeredAt)}
      </span>
    ),
  },
];

export function TppClientTable({ clients, isLoading, onRowClick }: TppClientTableProps) {
  return (
    <DataTable
      columns={columns}
      data={clients}
      isLoading={isLoading}
      enableGlobalFilter
      onRowClick={onRowClick}
      emptyMessage="No TPP clients registered yet"
    />
  );
}
