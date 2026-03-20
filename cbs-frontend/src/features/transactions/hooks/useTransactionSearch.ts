import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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

function getInitialFilters(searchParams: URLSearchParams): TransactionFilters {
  return {
    ...DEFAULT_FILTERS,
    search: searchParams.get('q') ?? '',
    accountNumber: searchParams.get('acc') ?? '',
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
    type: (searchParams.get('type') as TransactionFilters['type']) ?? DEFAULT_FILTERS.type,
    channel: (searchParams.get('ch') as TransactionFilters['channel']) ?? DEFAULT_FILTERS.channel,
    status: (searchParams.get('st') as TransactionFilters['status']) ?? DEFAULT_FILTERS.status,
  };
}

function mergeUrlFilters(base: TransactionFilters, searchParams: URLSearchParams): TransactionFilters {
  return {
    ...base,
    search: searchParams.get('q') ?? '',
    accountNumber: searchParams.get('acc') ?? '',
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
    type: (searchParams.get('type') as TransactionFilters['type']) ?? DEFAULT_FILTERS.type,
    channel: (searchParams.get('ch') as TransactionFilters['channel']) ?? DEFAULT_FILTERS.channel,
    status: (searchParams.get('st') as TransactionFilters['status']) ?? DEFAULT_FILTERS.status,
  };
}

function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return ['q', 'acc', 'from', 'to', 'type', 'ch', 'st'].some((key) => {
    const value = searchParams.get(key);
    return value !== null && value !== '';
  });
}

function toSearchParams(filters: TransactionFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.search.trim()) next.set('q', filters.search.trim());
  if (filters.accountNumber.trim()) next.set('acc', filters.accountNumber.trim());
  if (filters.dateFrom) next.set('from', filters.dateFrom);
  if (filters.dateTo) next.set('to', filters.dateTo);
  if (filters.type && filters.type !== 'ALL') next.set('type', filters.type);
  if (filters.channel && filters.channel !== 'ALL') next.set('ch', filters.channel);
  if (filters.status && filters.status !== 'ALL') next.set('st', filters.status);
  return next;
}

function areFiltersEqual(left: TransactionFilters, right: TransactionFilters): boolean {
  return (
    left.search === right.search &&
    left.accountNumber === right.accountNumber &&
    left.customerId === right.customerId &&
    left.dateFrom === right.dateFrom &&
    left.dateTo === right.dateTo &&
    left.amountFrom === right.amountFrom &&
    left.amountTo === right.amountTo &&
    left.type === right.type &&
    left.channel === right.channel &&
    left.status === right.status &&
    left.page === right.page &&
    left.pageSize === right.pageSize
  );
}

type SearchParamSyncAction = 'trigger' | 'manual-empty-search' | 'reset' | null;

export function useTransactionSearch(autoRefresh = false) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<TransactionFilters>(() => getInitialFilters(searchParams));
  const [submittedFilters, setSubmittedFilters] = useState<TransactionFilters>(() => getInitialFilters(searchParams));
  const [hasSearched, setHasSearched] = useState(() => hasUrlFilters(searchParams));
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const lastFetchStartedAtRef = useRef<number | null>(null);
  const searchParamSyncActionRef = useRef<SearchParamSyncAction>(null);

  const queryParams: TransactionSearchParams = useMemo(() => ({
    search: submittedFilters.search || undefined,
    accountNumber: submittedFilters.accountNumber || undefined,
    customerId: submittedFilters.customerId || undefined,
    dateFrom: submittedFilters.dateFrom || undefined,
    dateTo: submittedFilters.dateTo || undefined,
    amountFrom: submittedFilters.amountFrom > 0 ? submittedFilters.amountFrom : undefined,
    amountTo: submittedFilters.amountTo > 0 ? submittedFilters.amountTo : undefined,
    type: submittedFilters.type !== 'ALL' ? submittedFilters.type : undefined,
    channel: submittedFilters.channel !== 'ALL' ? submittedFilters.channel : undefined,
    status: submittedFilters.status !== 'ALL' ? submittedFilters.status : undefined,
    page: submittedFilters.page,
    pageSize: submittedFilters.pageSize,
  }), [submittedFilters]);

  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['transactions', 'search', submittedFilters],
    queryFn: async () => {
      lastFetchStartedAtRef.current = Date.now();
      return transactionApi.searchTransactions(queryParams);
    },
    enabled: hasSearched,
    staleTime: 30_000,
    refetchInterval: autoRefresh && hasSearched ? 30_000 : false,
  });

  const transactions: Transaction[] = data?.transactions ?? [];
  const summary: TransactionSummary = data?.summary ?? EMPTY_SUMMARY;

  useEffect(() => {
    const nextHasUrlFilters = hasUrlFilters(searchParams);
    const syncAction = searchParamSyncActionRef.current;

    if (syncAction === 'reset' && !nextHasUrlFilters) {
      searchParamSyncActionRef.current = null;
      return;
    }

    if (syncAction === 'manual-empty-search' && !nextHasUrlFilters) {
      searchParamSyncActionRef.current = null;
      return;
    }

    if (syncAction === 'trigger') {
      setFilters((prev) => mergeUrlFilters(prev, searchParams));
      setSubmittedFilters((prev) => mergeUrlFilters(prev, searchParams));
      setHasSearched(true);
      searchParamSyncActionRef.current = null;
      return;
    }

    const nextFilters = getInitialFilters(searchParams);
    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
    setHasSearched(nextHasUrlFilters);
  }, [searchParams]);

  useEffect(() => {
    if (!hasSearched || !dataUpdatedAt || lastFetchStartedAtRef.current === null) return;
    setElapsedMs(Math.max(0, Date.now() - lastFetchStartedAtRef.current));
  }, [dataUpdatedAt, hasSearched]);

  const updateFilters = useCallback((partial: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const triggerSearch = useCallback(() => {
    const nextFilters = { ...filters, page: 0 };
    const nextSearchParams = toSearchParams(nextFilters);
    const nextSearchParamString = nextSearchParams.toString();
    const currentSearchParamString = searchParams.toString();
    const shouldForceRefetch = hasSearched && areFiltersEqual(nextFilters, submittedFilters);

    if (nextSearchParamString && nextSearchParamString !== currentSearchParamString) {
      searchParamSyncActionRef.current = 'trigger';
    } else if (!nextSearchParamString && currentSearchParamString) {
      searchParamSyncActionRef.current = 'manual-empty-search';
    } else {
      searchParamSyncActionRef.current = null;
    }

    setFilters(nextFilters);
    setSubmittedFilters(nextFilters);
    setHasSearched(true);
    setSearchParams(nextSearchParams);
    setElapsedMs(null);
    if (shouldForceRefetch) {
      void refetch();
    }
  }, [filters, hasSearched, refetch, searchParams, setSearchParams, submittedFilters]);

  const resetFilters = useCallback(() => {
    searchParamSyncActionRef.current = searchParams.toString() ? 'reset' : null;
    setFilters(DEFAULT_FILTERS);
    setSubmittedFilters(DEFAULT_FILTERS);
    setHasSearched(false);
    setElapsedMs(null);
    setSearchParams(new URLSearchParams());
  }, [searchParams, setSearchParams]);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSubmittedFilters((prev) => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => ({ ...prev, page: 0, pageSize }));
    setSubmittedFilters((prev) => ({ ...prev, page: 0, pageSize }));
  }, []);

  return {
    filters,
    updateFilters,
    triggerSearch,
    resetFilters,
    setPage,
    setPageSize,
    transactions,
    summary,
    isLoading,
    isFetching,
    isRefreshing: isFetching && !isLoading,
    isError,
    refetch,
    elapsedMs,
    hasSearched,
  };
}
