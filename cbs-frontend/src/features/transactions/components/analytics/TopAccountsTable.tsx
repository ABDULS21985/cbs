import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney } from '@/lib/formatters';
import { exportToExcel } from '@/lib/export/excelExport';
import type { TopAccountActivity } from '../../api/transactionAnalyticsApi';

interface TopAccountsTableProps {
  data: TopAccountActivity[];
  isLoading?: boolean;
  onAccountClick?: (accountNumber: string) => void;
}

export function TopAccountsTable({
  data,
  isLoading = false,
  onAccountClick,
}: TopAccountsTableProps) {
  const columns = useMemo<ColumnDef<TopAccountActivity>[]>(
    () => [
      {
        accessorKey: 'accountNumber',
        header: 'Account Number',
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.accountNumber}</span>,
      },
      {
        accessorKey: 'accountName',
        header: 'Account Name',
      },
      {
        accessorKey: 'transactionCount',
        header: 'Transaction Count',
        cell: ({ row }) => row.original.transactionCount.toLocaleString(),
      },
      {
        accessorKey: 'totalDebit',
        header: 'Total Debit',
        cell: ({ row }) => formatMoney(row.original.totalDebit),
      },
      {
        accessorKey: 'totalCredit',
        header: 'Total Credit',
        cell: ({ row }) => formatMoney(row.original.totalCredit),
      },
      {
        accessorKey: 'netAmount',
        header: 'Net',
        cell: ({ row }) => formatMoney(row.original.netAmount),
      },
      {
        accessorKey: 'lastTransactionDate',
        header: 'Last Transaction',
      },
    ],
    [],
  );

  const handleExport = () => {
    exportToExcel(
      data.map((row) => ({
        accountNumber: row.accountNumber,
        accountName: row.accountName,
        transactionCount: row.transactionCount,
        totalDebit: row.totalDebit,
        totalCredit: row.totalCredit,
        netAmount: row.netAmount,
        lastTransactionDate: row.lastTransactionDate,
      })),
      [
        { key: 'accountNumber', label: 'Account Number' },
        { key: 'accountName', label: 'Account Name' },
        { key: 'transactionCount', label: 'Transaction Count' },
        { key: 'totalDebit', label: 'Total Debit', format: 'money' },
        { key: 'totalCredit', label: 'Total Credit', format: 'money' },
        { key: 'netAmount', label: 'Net Amount', format: 'money' },
        { key: 'lastTransactionDate', label: 'Last Transaction' },
      ],
      'transaction-analytics-top-accounts',
    );
  };

  return (
    <div className="surface-card p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Top Accounts by Activity</h2>
          <p className="text-sm text-muted-foreground">
            Searchable, sortable view of the most active accounts in the selected period.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={(row) => onAccountClick?.(row.accountNumber)}
        pageSize={10}
        emptyMessage="No account activity found for the selected period"
      />
    </div>
  );
}
