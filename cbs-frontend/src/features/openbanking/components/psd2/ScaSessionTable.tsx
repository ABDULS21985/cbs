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
  TOTP: 'TOTP',
  FIDO2: 'FIDO2',
  PHOTO_TAN: 'Photo TAN',
  CHIP_TAN: 'Chip TAN',
};

function getDurationMs(session: Psd2ScaSession): string {
  if (!session.finalisedAt) return '—';
  const start = new Date(session.createdAt).getTime();
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
        accessorKey: 'tppId',
        header: 'TPP',
        cell: ({ getValue }) => (
          <span className="text-sm font-mono text-xs">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'scaMethod',
        header: 'Method',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {METHOD_LABELS[getValue<string>()] || getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'scaStatus',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
      },
      {
        accessorKey: 'exemptionType',
        header: 'Exemption',
        cell: ({ getValue }) => {
          const val = getValue<string | null>();
          return val ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              {val.replace(/_/g, ' ')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
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
        accessorKey: 'createdAt',
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
