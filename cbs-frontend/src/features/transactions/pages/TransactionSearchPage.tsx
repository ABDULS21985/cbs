import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SummaryBar, EmptyState } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { useTransactionSearch } from '../hooks/useTransactionSearch';
import { TransactionSearchForm } from '../components/TransactionSearchForm';
import { TransactionResultsTable } from '../components/TransactionResultsTable';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import type { Transaction } from '../api/transactionApi';

export function TransactionSearchPage() {
  const {
    filters,
    updateFilters,
    triggerSearch,
    resetFilters,
    transactions,
    summary,
    isLoading,
    isFetching,
    hasSearched,
  } = useTransactionSearch();

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleRowClick = (t: Transaction) => {
    setSelectedTransaction(t);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedTransaction(null);
  };

  const handleExport = () => {
    if (transactions.length === 0) return;
    const headers = ['Reference', 'Date/Time', 'Type', 'Channel', 'Status', 'From Account', 'From Name', 'To Account', 'To Name', 'Debit', 'Credit', 'Fee', 'Narration'];
    const rows = transactions.map((t) => [
      t.reference,
      t.dateTime,
      t.type,
      t.channel,
      t.status,
      t.fromAccount ?? '',
      t.fromAccountName ?? '',
      t.toAccount ?? '',
      t.toAccountName ?? '',
      t.debitAmount?.toString() ?? '',
      t.creditAmount?.toString() ?? '',
      t.fee?.toString() ?? '',
      t.narration,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summaryItems = [
    {
      label: 'Results',
      value: summary.totalResults,
      format: 'number' as const,
    },
    {
      label: 'Total Debit',
      value: summary.totalDebit,
      format: 'money' as const,
      color: summary.totalDebit > 0 ? 'danger' : 'default' as const,
    },
    {
      label: 'Total Credit',
      value: summary.totalCredit,
      format: 'money' as const,
      color: summary.totalCredit > 0 ? 'success' : 'default' as const,
    },
    {
      label: 'Net',
      value: summary.netAmount,
      format: 'money' as const,
      color: summary.netAmount >= 0 ? 'success' : 'danger' as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="Transaction History"
        subtitle="Search and review all transaction records"
        actions={
          <button
            onClick={handleExport}
            disabled={transactions.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      <div className="page-container space-y-4">
        <TransactionSearchForm
          filters={filters}
          onChange={updateFilters}
          onSearch={triggerSearch}
          onReset={resetFilters}
          isLoading={isLoading || isFetching}
        />

        {hasSearched && (
          <SummaryBar items={summaryItems} />
        )}

        {hasSearched ? (
          <TransactionResultsTable
            transactions={transactions}
            isLoading={isLoading || isFetching}
            onRowClick={handleRowClick}
          />
        ) : (
          <EmptyState
            title="Search for transactions"
            description="Use the search form above to find transactions by reference, account, date range, or other criteria."
            icon={Search}
          />
        )}
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        open={detailOpen}
        onClose={handleCloseDetail}
      />
    </>
  );
}
