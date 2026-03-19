import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { formatDate } from '@/lib/formatters';
import { getRecurringDeposits } from '../api/goalApi';
import type { RecurringDeposit } from '../api/goalApi';

export function RecurringDepositListPage() {
  const navigate = useNavigate();

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ['recurring-deposits'],
    queryFn: getRecurringDeposits,
  });

  const columns = useMemo<ColumnDef<RecurringDeposit, unknown>[]>(
    () => [
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="tabular-nums font-medium">{formatMoney(getValue() as number)}</span>
        ),
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        cell: ({ getValue }) => {
          const freq = getValue() as string;
          const colors: Record<string, string> = {
            DAILY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            WEEKLY: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            MONTHLY: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
          };
          return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[freq] ?? ''}`}>
              {freq.charAt(0) + freq.slice(1).toLowerCase()}
            </span>
          );
        },
      },
      {
        id: 'installments',
        header: 'Installments',
        cell: ({ row }) => {
          const { installmentsPaid, totalInstallments } = row.original;
          const pct = Math.round((installmentsPaid / totalInstallments) * 100);
          return (
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm tabular-nums text-muted-foreground">
                {installmentsPaid}/{totalInstallments}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} dot />,
      },
      {
        accessorKey: 'nextDueDate',
        header: 'Next Due Date',
        cell: ({ getValue, row }) => {
          const date = getValue() as string;
          const isMissed = row.original.status === 'MISSED';
          return (
            <span className={isMissed ? 'text-red-600 dark:text-red-400 font-medium' : 'text-sm'}>
              {formatDate(date)}
            </span>
          );
        },
      },
      {
        id: 'penalty',
        header: 'Penalty',
        cell: ({ row }) => {
          const penalty = row.original.penalty;
          if (!penalty) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <span className="text-red-600 dark:text-red-400 tabular-nums text-sm font-medium">
              {formatMoney(penalty)}
            </span>
          );
        },
      },
    ],
    [],
  );

  const activeCount = deposits.filter((d) => d.status === 'ACTIVE').length;
  const missedCount = deposits.filter((d) => d.status === 'MISSED').length;

  return (
    <>
      <PageHeader
        title="Recurring Deposits"
        subtitle="Manage scheduled deposit plans for customers"
      />

      <div className="page-container space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Plans</div>
            <div className="stat-value">{deposits.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active</div>
            <div className="stat-value text-green-600 dark:text-green-400">{activeCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Missed</div>
            <div className="stat-value text-red-600 dark:text-red-400">{missedCount}</div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={deposits}
          isLoading={isLoading}
          enableGlobalFilter
          enableColumnVisibility
          pageSize={10}
          onRowClick={(rd: RecurringDeposit) => navigate(`/accounts/recurring-deposits/${rd.id}`)}
          emptyMessage="No recurring deposits found"
        />
      </div>
    </>
  );
}
