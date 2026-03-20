import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { Ban, CheckCircle2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { ApiConsent } from '../../api/openBankingApi';

interface ConsentTableProps {
  consents: ApiConsent[];
  isLoading?: boolean;
  onRowClick?: (consent: ApiConsent) => void;
  onAuthorise?: (consent: ApiConsent) => void;
  onRevoke?: (consent: ApiConsent) => void;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: ApiConsent[]) => void;
  bulkActions?: React.ReactNode;
}

export function ConsentTable({
  consents,
  isLoading,
  onRowClick,
  onAuthorise,
  onRevoke,
  enableRowSelection,
  onRowSelectionChange,
  bulkActions,
}: ConsentTableProps) {
  const columns: ColumnDef<ApiConsent, unknown>[] = [
    {
      accessorKey: 'consentId',
      header: 'Consent ID',
      cell: ({ row }) => (
        <code className="text-xs font-mono text-muted-foreground">{row.original.consentId}</code>
      ),
    },
    {
      accessorKey: 'tppClientName',
      header: 'TPP Name',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.tppClientName ?? `TPP #${row.original.tppClientId}`}
        </span>
      ),
    },
    {
      accessorKey: 'customerId',
      header: 'Customer',
      cell: ({ row }) => (
        <span className="text-sm">#{row.original.customerId}</span>
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
      accessorKey: 'createdAt',
      header: 'Granted',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.original.authorisedAt ?? row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.expiresAt)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot size="sm" />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const consent = row.original;
        return (
          <div className="flex items-center gap-1">
            {consent.status === 'PENDING' && onAuthorise && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAuthorise(consent);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-green-300 text-green-600 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                Authorise
              </button>
            )}
            {(consent.status === 'AUTHORISED' || consent.status === 'PENDING') && onRevoke && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRevoke(consent);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <Ban className="w-3 h-3" />
                Revoke
              </button>
            )}
            {consent.status !== 'PENDING' && consent.status !== 'AUTHORISED' && (
              <span className="text-xs text-muted-foreground italic">--</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={consents}
      isLoading={isLoading}
      enableGlobalFilter
      onRowClick={onRowClick}
      enableRowSelection={enableRowSelection}
      onRowSelectionChange={onRowSelectionChange}
      bulkActions={bulkActions}
      emptyMessage="No consents found"
    />
  );
}
