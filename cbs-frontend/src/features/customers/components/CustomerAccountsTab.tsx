import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';
import { formatDate } from '@/lib/formatters';
import { usePermission } from '@/hooks/usePermission';
import { useCustomerAccounts } from '../hooks/useCustomers';
import type { CustomerAccount } from '../types/customer';

export function CustomerAccountsTab({ customerId }: { customerId: number }) {
  const navigate = useNavigate();
  const canCreate = usePermission('accounts', 'create');
  const { data: accounts, isLoading } = useCustomerAccounts(customerId);

  const columns: ColumnDef<CustomerAccount>[] = [
    {
      accessorKey: 'accountNumber',
      header: 'Account #',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.accountNumber}</span>
      ),
    },
    { accessorKey: 'accountType', header: 'Type' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot />,
    },
    { accessorKey: 'currency', header: 'CCY' },
    {
      accessorKey: 'availableBalance',
      header: 'Available',
      cell: ({ row }) => (
        <MoneyDisplay amount={row.original.availableBalance} currency={row.original.currency} size="sm" />
      ),
    },
    {
      accessorKey: 'ledgerBalance',
      header: 'Ledger',
      cell: ({ row }) => (
        <MoneyDisplay amount={row.original.ledgerBalance} currency={row.original.currency} size="sm" />
      ),
    },
    {
      accessorKey: 'dateOpened',
      header: 'Opened',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.dateOpened)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/accounts/new?customerId=${customerId}`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Open New Account
          </button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={accounts ?? []}
        isLoading={isLoading}
        onRowClick={row => navigate(`/accounts/${row.id}`)}
        emptyMessage="No accounts found for this customer"
      />
    </div>
  );
}
