import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
import type { Psd2TppRegistration } from '../../api/psd2Api';
import { TppActivationActions } from './TppActivationActions';

interface TppRegistrationTableProps {
  data: Psd2TppRegistration[];
  isLoading?: boolean;
}

const TYPE_STYLES: Record<string, string> = {
  AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CBPII: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ASPSP: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export function TppRegistrationTable({ data, isLoading }: TppRegistrationTableProps) {
  const columns = useMemo<ColumnDef<Psd2TppRegistration, unknown>[]>(
    () => [
      {
        accessorKey: 'tppName',
        header: 'TPP Name',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.tppName}</div>
            <div className="text-xs text-muted-foreground font-mono">{row.original.tppId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'tppType',
        header: 'Type',
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[val] || 'bg-muted text-muted-foreground'}`}>
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: 'nationalAuthority',
        header: 'NCA',
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>() || '—'}</span>
        ),
      },
      {
        accessorKey: 'authorizationNumber',
        header: 'Authorization #',
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-muted-foreground">{getValue<string>() || '—'}</span>
        ),
      },
      {
        accessorKey: 'scaApproach',
        header: 'SCA',
        cell: ({ getValue }) => (
          <span className="text-xs px-2 py-0.5 rounded bg-muted">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'allowedScopes',
        header: 'Scopes',
        cell: ({ getValue }) => {
          const scopes = getValue<string[]>() ?? [];
          return (
            <div className="flex flex-wrap gap-1">
              {scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs font-mono"
                >
                  {scope}
                </span>
              ))}
              {scopes.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'certificateValid',
        header: 'Cert',
        cell: ({ getValue }) => (
          <span className={`text-xs font-medium ${getValue<boolean>() ? 'text-green-600' : 'text-red-600'}`}>
            {getValue<boolean>() ? 'Valid' : 'Invalid'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Registered',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{formatDate(getValue<string>())}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <TppActivationActions tpp={row.original} />
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No TPP registrations found"
      pageSize={10}
    />
  );
}
