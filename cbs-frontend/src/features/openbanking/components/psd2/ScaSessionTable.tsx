import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/formatters';
import type { Psd2ScaSession } from '../../api/psd2Api';

interface ScaSessionTableProps {
  data: Psd2ScaSession[];
  isLoading?: boolean;
  onRowClick?: (session: Psd2ScaSession) => void;
}

const METHOD_LABELS: Record<string, string> = {
  SMS_OTP: 'SMS OTP',
  PUSH: 'Push Notification',
  BIOMETRIC: 'Biometric',
  HARDWARE_TOKEN: 'Hardware Token',
};

function getDurationMs(session: Psd2ScaSession): string {
  if (!session.finalisedAt) return '—';
  const start = new Date(session.initiatedAt).getTime();
  const end = new Date(session.finalisedAt).getTime();
  const diff = end - start;
  if (diff < 1000) return `${diff}ms`;
  if (diff < 60_000) return `${(diff / 1000).toFixed(1)}s`;
  return `${Math.floor(diff / 60_000)}m ${Math.round((diff % 60_000) / 1000)}s`;
}

export function ScaSessionTable({ data, isLoading, onRowClick }: ScaSessionTableProps) {
  const columns = useMemo<ColumnDef<Psd2ScaSession, unknown>[]>(
    () => [
      {
        accessorKey: 'sessionId',
        header: 'Session ID',
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {getValue<string>().slice(0, 12)}...
          </span>
        ),
      },
      {
        accessorKey: 'customerId',
        header: 'Customer',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium">#{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'tppName',
        header: 'TPP',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.tppName || row.original.tppId}</span>
        ),
      },
      {
        accessorKey: 'scopes',
        header: 'Scopes',
        cell: ({ getValue }) => (
          <div className="flex flex-wrap gap-1">
            {getValue<string[]>().map((scope) => (
              <span
                key={scope}
                className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono"
              >
                {scope}
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
        accessorKey: 'authMethod',
        header: 'Method',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {METHOD_LABELS[getValue<string>()] || getValue<string>()}
          </span>
        ),
      },
      {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {getDurationMs(row.original)}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'initiatedAt',
        header: 'Initiated',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(getValue<string>())}
          </span>
        ),
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
      onRowClick={onRowClick}
      emptyMessage="No SCA sessions found"
      pageSize={10}
    />
  );
}
