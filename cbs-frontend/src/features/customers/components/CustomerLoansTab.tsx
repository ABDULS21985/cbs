import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { DataTable, StatusBadge, MoneyDisplay } from '@/components/shared';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/formatters';
import { useCustomerLoans } from '../hooks/useCustomers';
import type { CustomerLoan } from '../types/customer';

const CLOSED_STATUSES = ['CLOSED', 'WRITTEN_OFF', 'SETTLED', 'LIQUIDATED'];

export function CustomerLoansTab({
  customerId,
  customerName,
  active,
}: {
  customerId: number;
  customerName?: string;
  active: boolean;
}) {
  const navigate = useNavigate();
  const canCreateLoan = usePermission('lending', 'create');
  const { data: loans, isLoading } = useCustomerLoans(customerId, active);
  const createLoanQuery = new URLSearchParams({
    customerId: String(customerId),
    ...(customerName ? { customerName } : {}),
  }).toString();

  const activeLoans = loans?.filter(l => !CLOSED_STATUSES.includes(l.status)) ?? [];
  const closedLoans = loans?.filter(l => CLOSED_STATUSES.includes(l.status)) ?? [];

  const columns: ColumnDef<CustomerLoan>[] = [
    { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.loanNumber}</span> },
    { accessorKey: 'productName', header: 'Product', cell: ({ row }) => <span className="text-sm">{row.original.productName}</span> },
    { accessorKey: 'disbursedAmount', header: 'Disbursed', cell: ({ row }) => <MoneyDisplay amount={row.original.disbursedAmount} size="sm" /> },
    { accessorKey: 'outstandingBalance', header: 'Outstanding', cell: ({ row }) => <MoneyDisplay amount={row.original.outstandingBalance} size="sm" /> },
    {
      accessorKey: 'dpd',
      header: 'DPD',
      cell: ({ row }) => (
        <span className={`text-sm font-medium ${row.original.dpd > 30 ? 'text-red-600 dark:text-red-400' : row.original.dpd > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {row.original.dpd}d
        </span>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot /> },
    { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => <span className="text-xs">{row.original.maturityDate ? formatDate(row.original.maturityDate) : '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 surface-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Customer Loans</p>
          <p className="text-xs text-muted-foreground">Review this customer’s facilities or start a new loan application with their profile preloaded.</p>
        </div>
        {canCreateLoan && (
          <button
            type="button"
            onClick={() => navigate(`/lending/applications/new?${createLoanQuery}`)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Application
          </button>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Active Loans ({activeLoans.length})
        </h3>
        <DataTable
          columns={columns}
          data={activeLoans}
          isLoading={isLoading}
          onRowClick={row => navigate(`/lending/${row.id}`)}
          emptyMessage="No active loans"
        />
      </div>
      {closedLoans.length > 0 && (
        <details className="group">
          <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 list-none flex items-center gap-1 select-none">
            <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
            Closed / Settled Loans ({closedLoans.length})
          </summary>
          <div className="mt-3">
            <DataTable
              columns={columns}
              data={closedLoans}
              pageSize={5}
              onRowClick={row => navigate(`/lending/${row.id}`)}
              emptyMessage=""
            />
          </div>
        </details>
      )}
    </div>
  );
}
