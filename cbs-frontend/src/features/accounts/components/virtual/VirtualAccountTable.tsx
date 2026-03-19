import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import type { VirtualAccount } from '../../api/virtualAccountApi';

interface VirtualAccountTableProps {
  accounts: VirtualAccount[];
  onRowClick: (id: string) => void;
}

export function VirtualAccountTable({ accounts, onRowClick }: VirtualAccountTableProps) {
  const columns = useMemo<ColumnDef<VirtualAccount, unknown>[]>(
    () => [
      {
        accessorKey: 'vaNumber',
        header: 'VA #',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-primary">
            {row.original.vaNumber}
          </span>
        ),
      },
      {
        accessorKey: 'parentAccountNumber',
        header: 'Parent Account',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.parentAccountNumber}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium">{row.original.customerName}</div>
            <div className="text-xs text-muted-foreground">{row.original.customerId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'pattern',
        header: 'Pattern',
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono max-w-[160px] block truncate">
            {row.original.pattern}
          </code>
        ),
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {row.original.currency}
          </span>
        ),
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatMoney(row.original.balance, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'matchedMTD',
        header: 'Matched (MTD)',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.matchedMTD.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'unmatchedCount',
        header: 'Unmatched',
        cell: ({ row }) => {
          const count = row.original.unmatchedCount;
          return (
            <span
              className={
                count > 0
                  ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'text-sm text-muted-foreground'
              }
            >
              {count}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={accounts}
      enableGlobalFilter
      enableColumnVisibility
      onRowClick={(row) => onRowClick(row.id)}
      emptyMessage="No virtual accounts found"
    />
  );
}
