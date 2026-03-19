import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, MoneyDisplay, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { useCustomerTransactions } from '../hooks/useCustomers';
import type { CustomerTransaction } from '../types/customer';

export function CustomerTransactionsTab({ customerId, active }: { customerId: number; active: boolean }) {
  const { data, isLoading } = useCustomerTransactions(customerId, { page: 0, size: 50 }, active);

  const columns: ColumnDef<CustomerTransaction>[] = [
    {
      accessorKey: 'transactionRef',
      header: 'Reference',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.transactionRef}</span>,
    },
    {
      accessorKey: 'accountNumber',
      header: 'Account',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`text-xs font-semibold ${row.original.type === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <MoneyDisplay
          amount={row.original.amount}
          currency={row.original.currency}
          size="sm"
          colorCode
          showSign={row.original.type === 'CREDIT'}
        />
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-xs max-w-[200px] truncate block">{row.original.description}</span>
      ),
    },
    {
      accessorKey: 'transactionDate',
      header: 'Date',
      cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.transactionDate)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.items ?? []}
      isLoading={isLoading}
      enableExport
      exportFilename={`customer-${customerId}-transactions`}
      emptyMessage="No transactions found"
    />
  );
}
