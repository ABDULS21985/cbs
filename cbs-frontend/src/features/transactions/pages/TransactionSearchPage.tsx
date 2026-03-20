import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SummaryBar, EmptyState } from '@/components/shared';

import { useTransactionSearch } from '../hooks/useTransactionSearch';
import { TransactionSearchForm, getTransactionSearchValidationErrors } from '../components/TransactionSearchForm';
import { TransactionResultsTable } from '../components/TransactionResultsTable';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import type { Transaction } from '../api/transactionApi';

const AUTO_REFRESH_STORAGE_KEY = 'transactions:auto-refresh';

function toLocalDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionSearchPage() {
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem(AUTO_REFRESH_STORAGE_KEY) === 'true');
  const {
    filters,
    updateFilters,
    triggerSearch,
    resetFilters,
    transactions,
    summary,
    isLoading,
    isFetching,
    isRefreshing,
    isError,
    refetch,
    elapsedMs,
    hasSearched,
    setPage,
    setPageSize,
  } = useTransactionSearch(autoRefresh);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { hasErrors } = useMemo(() => getTransactionSearchValidationErrors(filters), [filters]);
  const isInitialResultsLoading = isLoading && transactions.length === 0;

  const handleExport = useCallback(() => {
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
    link.download = `transactions-${toLocalDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [transactions]);

  useEffect(() => {
    document.title = 'Transaction History | CBS';
  }, []);

  useEffect(() => {
    localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(autoRefresh));
  }, [autoRefresh]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailOpen) {
        event.preventDefault();
        handleCloseDetail();
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key === 'Enter' && !hasErrors) {
        event.preventDefault();
        triggerSearch();
      }

      if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        handleExport();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [detailOpen, hasErrors, triggerSearch, handleExport]);

  const handleRowClick = (t: Transaction) => {
    setSelectedTransaction(t);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedTransaction(null);
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
      color: (summary.totalDebit > 0 ? 'danger' : 'default') as 'danger' | 'default',
    },
    {
      label: 'Total Credit',
      value: summary.totalCredit,
      format: 'money' as const,
      color: (summary.totalCredit > 0 ? 'success' : 'default') as 'success' | 'default',
    },
    {
      label: 'Net',
      value: summary.netAmount,
      format: 'money' as const,
      color: (summary.netAmount >= 0 ? 'success' : 'danger') as 'success' | 'danger',
    },
  ];

  return (
    <>
      <PageHeader
        title="Transaction History"
        subtitle="Search and review all transaction records"
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 rounded border"
              />
              Auto-refresh
            </label>
            {autoRefresh && (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
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

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to search transactions. Check your connection.</span>
            </div>
            <button
              onClick={() => refetch()}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-900/40 dark:hover:bg-red-900/20"
            >
              Retry
            </button>
          </div>
        )}

        {hasSearched && !isInitialResultsLoading && !isError && elapsedMs !== null && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Found <span className="font-medium text-foreground">{summary.totalResults.toLocaleString()}</span> transactions in <span className="font-mono text-foreground">{elapsedMs}ms</span>
            </span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Refreshing…
              </span>
            )}
          </div>
        )}

        {hasSearched && (
          <SummaryBar items={summaryItems} isLoading={isInitialResultsLoading} />
        )}

        {hasSearched ? (
          <TransactionResultsTable
            transactions={transactions}
            isLoading={isInitialResultsLoading}
            onRowClick={handleRowClick}
            pageIndex={filters.page}
            pageSize={filters.pageSize}
            totalRows={summary.totalResults}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
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
