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

const ROLE_STYLES: Record<string, string> = {
  AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  CBPII: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
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
        accessorKey: 'nationalCompetentAuthority',
        header: 'NCA',
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'registrationNumber',
        header: 'Registration #',
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-muted-foreground">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'eidasCertRef',
        header: 'eIDAS Cert',
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-muted-foreground truncate max-w-[140px] block">
            {getValue<string>() || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'roles',
        header: 'Roles',
        cell: ({ getValue }) => (
          <div className="flex flex-wrap gap-1">
            {getValue<string[]>().map((role) => (
              <span
                key={role}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[role] || 'bg-muted text-muted-foreground'}`}
              >
                {role}
              </span>
            ))}
          </div>
        ),
        enableSorting: false,
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
