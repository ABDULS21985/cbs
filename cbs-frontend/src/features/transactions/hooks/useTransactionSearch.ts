import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionApi, type TransactionSearchParams, type TransactionSummary, type Transaction } from '../api/transactionApi';

export interface TransactionFilters {
  search: string;
  accountNumber: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
  amountFrom: number;
  amountTo: number;
  type: TransactionSearchParams['type'];
  channel: TransactionSearchParams['channel'];
  status: TransactionSearchParams['status'];
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: TransactionFilters = {
  search: '',
  accountNumber: '',
  customerId: '',
  dateFrom: '',
  dateTo: '',
  amountFrom: 0,
  amountTo: 0,
  type: 'ALL',
  channel: 'ALL',
  status: 'ALL',
  page: 0,
  pageSize: 20,
};

const EMPTY_SUMMARY: TransactionSummary = {
  totalResults: 0,
  totalDebit: 0,
  totalCredit: 0,
  netAmount: 0,
};

export function useTransactionSearch() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [enabled, setEnabled] = useState(false);

  const queryParams: TransactionSearchParams = {
    search: filters.search || undefined,
    accountNumber: filters.accountNumber || undefined,
    customerId: filters.customerId || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    amountFrom: filters.amountFrom > 0 ? filters.amountFrom : undefined,
    amountTo: filters.amountTo > 0 ? filters.amountTo : undefined,
    type: filters.type !== 'ALL' ? filters.type : undefined,
    channel: filters.channel !== 'ALL' ? filters.channel : undefined,
    status: filters.status !== 'ALL' ? filters.status : undefined,
    page: filters.page,
    pageSize: filters.pageSize,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', 'search', filters],
    queryFn: () => transactionApi.searchTransactions(queryParams),
    enabled,
    staleTime: 30_000,
  });

  const transactions: Transaction[] = data?.transactions ?? [];
  const summary: TransactionSummary = data?.summary ?? EMPTY_SUMMARY;

  const updateFilters = useCallback((partial: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const triggerSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: 0 }));
    setEnabled(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setEnabled(false);
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    filters,
    updateFilters,
    triggerSearch,
    resetFilters,
    setPage,
    transactions,
    summary,
    isLoading,
    isFetching,
    hasSearched: enabled,
  };
}
