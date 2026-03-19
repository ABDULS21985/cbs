import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, SummaryBar, EmptyState } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { useTransactions } from '../../hooks/useTransactions';
import { TransactionFilters } from './TransactionFilters';
import { TransactionDetailModal } from './TransactionDetailModal';
import type { Transaction } from '../../api/accountDetailApi';

interface TransactionsTabProps {
  accountId: string;
}

const columns: ColumnDef<Transaction, any>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ getValue }) => (
      <span className="text-sm whitespace-nowrap">{formatDate(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.description}</p>
        <p className="text-xs text-muted-foreground">{row.original.channel}</p>
      </div>
    ),
  },
  {
    accessorKey: 'debitAmount',
    header: 'Debit',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v ? (
        <span className="font-mono text-sm text-red-600">
          {formatMoney(v)}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: 'creditAmount',
    header: 'Credit',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v ? (
        <span className="font-mono text-sm text-green-600">
          {formatMoney(v)}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: 'runningBalance',
    header: 'Balance',
    cell: ({ getValue }) => (
      <span className="font-mono text-sm tabular-nums">
        {formatMoney(getValue<number>())}
      </span>
    ),
  },
];

export function TransactionsTab({ accountId }: TransactionsTabProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const {
    transactions, isLoading,
    dateRange, setDateRange,
    type, setType,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    searchText, setSearchText,
    summary,
  } = useTransactions(accountId);

  return (
    <div className="p-4 space-y-3">
      <div className="rounded-lg border overflow-hidden bg-card">
        <TransactionFilters
          dateRange={dateRange}
          setDateRange={setDateRange}
          type={type}
          setType={setType}
          minAmount={minAmount}
          setMinAmount={setMinAmount}
          maxAmount={maxAmount}
          setMaxAmount={setMaxAmount}
          searchText={searchText}
          setSearchText={setSearchText}
        />

        <DataTable
          columns={columns}
          data={transactions}
          isLoading={isLoading}
          onRowClick={(row) => setSelectedTransaction(row)}
          emptyMessage="No transactions match your filters"
          pageSize={15}
        />
      </div>

      <SummaryBar
        items={[
          { label: 'Total Debits', value: summary.totalDebits, format: 'money', color: 'danger' },
          { label: 'Total Credits', value: summary.totalCredits, format: 'money', color: 'success' },
          { label: 'Net', value: summary.netAmount, format: 'money', color: summary.netAmount >= 0 ? 'success' : 'danger' },
        ]}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
