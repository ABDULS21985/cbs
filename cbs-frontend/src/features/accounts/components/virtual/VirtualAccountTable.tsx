import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import type { VirtualAccount } from '../../types/virtualAccountExt';

interface VirtualAccountTableProps {
  accounts: VirtualAccount[];
  onRowClick: (id: string) => void;
}

export function VirtualAccountTable({ accounts, onRowClick }: VirtualAccountTableProps) {
  const columns = useMemo<ColumnDef<VirtualAccount, unknown>[]>(
    () => [
      {
        accessorKey: 'virtualAccountNumber',
        header: 'VA #',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-primary">
            {row.original.virtualAccountNumber}
          </span>
        ),
      },
      {
        accessorKey: 'masterAccountId',
        header: 'Physical Account',
        cell: ({ row }) => (
          <span className="font-mono text-sm">Master #{row.original.masterAccountId}</span>
        ),
      },
      {
        accessorKey: 'accountName',
        header: 'Account Name',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium">{row.original.accountName}</div>
            <div className="text-xs text-muted-foreground">Customer #{row.original.customerId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'referencePattern',
        header: 'Reference',
        cell: ({ row }) => (
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono max-w-[160px] block truncate">
            {row.original.externalReference || row.original.referencePattern || '—'}
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
        accessorKey: 'virtualBalance',
        header: 'Balance',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatMoney(row.original.virtualBalance, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'accountPurpose',
        header: 'Purpose',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {row.original.accountPurpose}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot />,
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
      onRowClick={(row: VirtualAccount) => onRowClick(String(row.id))}
      emptyMessage="No virtual accounts found"
    />
  );
}
