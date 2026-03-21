import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { transactionApi, type TransactionSearchParams, type TransactionSummary, type Transaction } from '../api/transactionApi';
import { createAccountUrlRef, resolveAccountUrlRef } from '../lib/urlAccountRef';

export type TransactionSortField = 'postingDate' | 'amount';
export type TransactionSortDirection = 'asc' | 'desc';

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
  flaggedOnly: boolean;
  page: number;
  pageSize: number;
  sortBy: TransactionSortField;
  sortDirection: TransactionSortDirection;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: TransactionFilters;
  createdAt: string;
}

export interface RecentSearch {
  id: string;
  label: string;
  filters: TransactionFilters;
  executedAt: string;
}

const SAVED_SEARCHES_STORAGE_KEY = 'transactions:saved-searches';
const RECENT_SEARCHES_STORAGE_KEY = 'transactions:recent-searches';

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
  flaggedOnly: false,
  page: 0,
  pageSize: 20,
  sortBy: 'postingDate',
  sortDirection: 'desc',
};

const EMPTY_SUMMARY: TransactionSummary = {
  totalResults: 0,
  totalDebit: 0,
  totalCredit: 0,
  netAmount: 0,
};
const EMPTY_TRANSACTIONS: Transaction[] = [];

type SearchParamSyncAction = 'trigger' | 'manual-empty-search' | 'reset' | null;

function getInitialFilters(searchParams: URLSearchParams): TransactionFilters {
  const sort = searchParams.get('sort') ?? '';
  const [sortBy, sortDirection] = sort.split(',') as [TransactionSortField | undefined, TransactionSortDirection | undefined];

  return {
    ...DEFAULT_FILTERS,
    search: searchParams.get('q') ?? '',
    accountNumber: resolveAccountUrlRef(searchParams.get('acc')),
    customerId: searchParams.get('cust') ?? '',
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
    amountFrom: Number(searchParams.get('amin') ?? 0) || 0,
    amountTo: Number(searchParams.get('amax') ?? 0) || 0,
    type: (searchParams.get('type') as TransactionFilters['type']) ?? DEFAULT_FILTERS.type,
    channel: (searchParams.get('ch') as TransactionFilters['channel']) ?? DEFAULT_FILTERS.channel,
    status: (searchParams.get('st') as TransactionFilters['status']) ?? DEFAULT_FILTERS.status,
    flaggedOnly: searchParams.get('flag') === '1',
    page: Number(searchParams.get('page') ?? DEFAULT_FILTERS.page) || DEFAULT_FILTERS.page,
    pageSize: Number(searchParams.get('pageSize') ?? DEFAULT_FILTERS.pageSize) || DEFAULT_FILTERS.pageSize,
    sortBy: sortBy === 'amount' || sortBy === 'postingDate' ? sortBy : DEFAULT_FILTERS.sortBy,
    sortDirection: sortDirection === 'asc' || sortDirection === 'desc'
      ? sortDirection
      : DEFAULT_FILTERS.sortDirection,
  };
}

function mergeUrlFilters(base: TransactionFilters, searchParams: URLSearchParams): TransactionFilters {
  const next = getInitialFilters(searchParams);
  return {
    ...base,
    ...next,
  };
}

function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return ['q', 'acc', 'cust', 'from', 'to', 'amin', 'amax', 'type', 'ch', 'st', 'flag', 'page', 'pageSize', 'sort'].some((key) => {
    const value = searchParams.get(key);
    return value !== null && value !== '';
  });
}

function toSearchParams(filters: TransactionFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.search.trim()) next.set('q', filters.search.trim());
  if (filters.accountNumber.trim()) next.set('acc', createAccountUrlRef(filters.accountNumber.trim()));
  if (filters.customerId.trim()) next.set('cust', filters.customerId.trim());
  if (filters.dateFrom) next.set('from', filters.dateFrom);
  if (filters.dateTo) next.set('to', filters.dateTo);
  if (filters.amountFrom > 0) next.set('amin', String(filters.amountFrom));
  if (filters.amountTo > 0) next.set('amax', String(filters.amountTo));
  if (filters.type && filters.type !== 'ALL') next.set('type', filters.type);
  if (filters.channel && filters.channel !== 'ALL') next.set('ch', filters.channel);
  if (filters.status && filters.status !== 'ALL') next.set('st', filters.status);
  if (filters.flaggedOnly) next.set('flag', '1');
  if (filters.page > 0) next.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_FILTERS.pageSize) next.set('pageSize', String(filters.pageSize));
  if (
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.sortDirection !== DEFAULT_FILTERS.sortDirection
  ) {
    next.set('sort', `${filters.sortBy},${filters.sortDirection}`);
  }
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
    left.flaggedOnly === right.flaggedOnly &&
    left.page === right.page &&
    left.pageSize === right.pageSize &&
    left.sortBy === right.sortBy &&
    left.sortDirection === right.sortDirection
  );
}

function sanitizeFilters(filters: TransactionFilters): TransactionFilters {
  const sortBy = filters.sortBy === 'amount' || filters.sortBy === 'postingDate'
    ? filters.sortBy
    : DEFAULT_FILTERS.sortBy;
  const sortDirection = filters.sortDirection === 'asc' || filters.sortDirection === 'desc'
    ? filters.sortDirection
    : DEFAULT_FILTERS.sortDirection;

  return {
    ...DEFAULT_FILTERS,
    ...filters,
    search: filters.search ?? '',
    accountNumber: filters.accountNumber ?? '',
    customerId: filters.customerId ?? '',
    dateFrom: filters.dateFrom ?? '',
    dateTo: filters.dateTo ?? '',
    amountFrom: Number.isFinite(filters.amountFrom) ? filters.amountFrom : 0,
    amountTo: Number.isFinite(filters.amountTo) ? filters.amountTo : 0,
    type: filters.type ?? DEFAULT_FILTERS.type,
    channel: filters.channel ?? DEFAULT_FILTERS.channel,
    status: filters.status ?? DEFAULT_FILTERS.status,
    flaggedOnly: Boolean(filters.flaggedOnly),
    page: Number.isFinite(filters.page) ? filters.page : 0,
    pageSize: Number.isFinite(filters.pageSize) ? filters.pageSize : DEFAULT_FILTERS.pageSize,
    sortBy,
    sortDirection,
  };
}

function normalizeStoredFilters(value: unknown): TransactionFilters {
  if (!value || typeof value !== 'object') {
    return DEFAULT_FILTERS;
  }
  return sanitizeFilters(value as TransactionFilters);
}

function readStoredItems<T>(storageKey: string, normalize: (value: unknown) => T): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize);
  } catch {
    return [];
  }
}

function createClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistStoredItems<T>(storageKey: string, items: T[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function getSearchDisplayParts(filters: TransactionFilters): string[] {
  const parts: string[] = [];
  if (filters.search.trim()) parts.push(filters.search.trim());
  if (filters.accountNumber.trim()) parts.push(`Acct ${filters.accountNumber.trim()}`);
  if (filters.customerId.trim()) parts.push(`Cust ${filters.customerId.trim()}`);
  if (filters.type && filters.type !== 'ALL') parts.push(filters.type);
  if (filters.status && filters.status !== 'ALL') parts.push(filters.status);
  if (filters.flaggedOnly) parts.push('Flagged only');
  if (filters.dateFrom || filters.dateTo) {
    parts.push([filters.dateFrom || 'Start', filters.dateTo || 'Now'].join(' - '));
  }
  return parts;
}

function buildRecentSearchLabel(filters: TransactionFilters): string {
  const parts = getSearchDisplayParts(filters);
  if (parts.length === 0) return 'All transactions';
  return parts.slice(0, 3).join(' · ');
}

function getPreviousPeriodFilters(filters: TransactionFilters): TransactionFilters | null {
  if (!filters.dateFrom || !filters.dateTo) {
    return null;
  }

  const from = parseISO(filters.dateFrom);
  const to = parseISO(filters.dateTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return null;
  }

  const daySpan = differenceInCalendarDays(to, from) + 1;
  const previousTo = subDays(from, 1);
  const previousFrom = subDays(previousTo, daySpan - 1);

  return sanitizeFilters({
    ...filters,
    dateFrom: toLocalDateStamp(previousFrom),
    dateTo: toLocalDateStamp(previousTo),
    page: 0,
  });
}

function toLocalDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useTransactionSearch(refreshIntervalMs: number | false = false) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<TransactionFilters>(() => getInitialFilters(searchParams));
  const [submittedFilters, setSubmittedFilters] = useState<TransactionFilters>(() => getInitialFilters(searchParams));
  const [hasSearched, setHasSearched] = useState(() => hasUrlFilters(searchParams));
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(
    () =>
      readStoredItems<SavedSearch>(SAVED_SEARCHES_STORAGE_KEY, (item) => {
        const saved = item as Partial<SavedSearch>;
        return {
          id: typeof saved.id === 'string' ? saved.id : createClientId('saved-search'),
          name: typeof saved.name === 'string' ? saved.name : buildRecentSearchLabel(DEFAULT_FILTERS),
          filters: normalizeStoredFilters(saved.filters),
          createdAt: typeof saved.createdAt === 'string' ? saved.createdAt : new Date().toISOString(),
        };
      }).slice(0, 10),
  );
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(
    () =>
      readStoredItems<RecentSearch>(RECENT_SEARCHES_STORAGE_KEY, (item) => {
        const recent = item as Partial<RecentSearch>;
        return {
          id: typeof recent.id === 'string' ? recent.id : createClientId('recent-search'),
          label: typeof recent.label === 'string' ? recent.label : buildRecentSearchLabel(DEFAULT_FILTERS),
          filters: normalizeStoredFilters(recent.filters),
          executedAt: typeof recent.executedAt === 'string' ? recent.executedAt : new Date().toISOString(),
        };
      }).slice(0, 5),
  );
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const lastFetchStartedAtRef = useRef<number | null>(null);
  const searchParamSyncActionRef = useRef<SearchParamSyncAction>(null);

  const buildQueryParams = useCallback((currentFilters: TransactionFilters): TransactionSearchParams => ({
    search: currentFilters.search || undefined,
    accountNumber: currentFilters.accountNumber || undefined,
    customerId: currentFilters.customerId || undefined,
    dateFrom: currentFilters.dateFrom || undefined,
    dateTo: currentFilters.dateTo || undefined,
    amountFrom: currentFilters.amountFrom > 0 ? currentFilters.amountFrom : undefined,
    amountTo: currentFilters.amountTo > 0 ? currentFilters.amountTo : undefined,
    type: currentFilters.type !== 'ALL' ? currentFilters.type : undefined,
    channel: currentFilters.channel !== 'ALL' ? currentFilters.channel : undefined,
    status: currentFilters.status !== 'ALL' ? currentFilters.status : undefined,
    flaggedOnly: currentFilters.flaggedOnly || undefined,
    page: currentFilters.page,
    pageSize: currentFilters.pageSize,
    sort: `${currentFilters.sortBy},${currentFilters.sortDirection}`,
  }), []);

  const queryParams: TransactionSearchParams = useMemo(
    () => buildQueryParams(submittedFilters),
    [buildQueryParams, submittedFilters],
  );

  const previousPeriodFilters = useMemo(
    () => (hasSearched ? getPreviousPeriodFilters(submittedFilters) : null),
    [hasSearched, submittedFilters],
  );

  const previousPeriodQueryParams = useMemo<TransactionSearchParams | null>(() => {
    if (!previousPeriodFilters) return null;
    return {
      ...buildQueryParams(previousPeriodFilters),
      page: 0,
      pageSize: 1,
    };
  }, [buildQueryParams, previousPeriodFilters]);

  const { data, isLoading, isFetching, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['transactions', 'search', submittedFilters],
    queryFn: async ({ signal }) => {
      lastFetchStartedAtRef.current = performance.now();
      const result = await transactionApi.searchTransactions(queryParams, { signal });
      const elapsed = lastFetchStartedAtRef.current === null
        ? null
        : performance.now() - lastFetchStartedAtRef.current;

      if (elapsed !== null && elapsed > 2_000) {
        console.warn(`[TXN SEARCH] Slow query: ${Math.round(elapsed)}ms`, queryParams);
      }

      return result;
    },
    enabled: hasSearched,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    refetchInterval: () => {
      if (!hasSearched || !refreshIntervalMs) return false;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return refreshIntervalMs;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: previousPeriodResult } = useQuery({
    queryKey: ['transactions', 'search', 'comparison', previousPeriodFilters],
    queryFn: ({ signal }) => transactionApi.searchTransactions(previousPeriodQueryParams!, { signal }),
    enabled: Boolean(hasSearched && previousPeriodQueryParams),
    staleTime: 60_000,
  });

  const transactions: Transaction[] = data?.transactions ?? EMPTY_TRANSACTIONS;
  const summary: TransactionSummary = data?.summary ?? EMPTY_SUMMARY;
  const previousSummary: TransactionSummary | null = previousPeriodResult?.summary ?? null;

  const comparisonPeriodLabel = useMemo(() => {
    if (!previousPeriodFilters) return null;
    return `${previousPeriodFilters.dateFrom} to ${previousPeriodFilters.dateTo}`;
  }, [previousPeriodFilters]);

  useEffect(() => {
    setIsReady(true);
  }, []);

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
    setElapsedMs(Math.max(0, Math.round(performance.now() - lastFetchStartedAtRef.current)));
  }, [dataUpdatedAt, hasSearched]);

  useEffect(() => {
    setSelectedTransactionIds((prev) => {
      const next = prev.filter((id) => transactions.some((transaction) => String(transaction.id) === id));
      return next.length === prev.length && next.every((id, index) => id === prev[index]) ? prev : next;
    });
  }, [transactions]);

  const persistRecentSearch = useCallback((nextFilters: TransactionFilters) => {
    setRecentSearches((prev) => {
      const filtersToStore = sanitizeFilters(nextFilters);
      const deduped = prev.filter((entry) => !areFiltersEqual(entry.filters, filtersToStore));
      const updated = [
        {
          id: createClientId('recent-search'),
          label: buildRecentSearchLabel(filtersToStore),
          filters: filtersToStore,
          executedAt: new Date().toISOString(),
        },
        ...deduped,
      ].slice(0, 5);
      persistStoredItems(RECENT_SEARCHES_STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  const runSearch = useCallback((nextFiltersInput: TransactionFilters, options?: { forceRefetch?: boolean }) => {
    const nextFilters = sanitizeFilters(nextFiltersInput);
    const nextSearchParams = toSearchParams(nextFilters);
    const nextSearchParamString = nextSearchParams.toString();
    const currentSearchParamString = searchParams.toString();
    const shouldForceRefetch =
      options?.forceRefetch ?? (hasSearched && areFiltersEqual(nextFilters, submittedFilters));

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
    setElapsedMs(null);
    setSelectedTransactionIds([]);
    setSearchParams(nextSearchParams);
    persistRecentSearch(nextFilters);

    if (shouldForceRefetch) {
      void refetch();
    }
  }, [hasSearched, persistRecentSearch, refetch, searchParams, setSearchParams, submittedFilters]);

  const updateFilters = useCallback((partial: Partial<TransactionFilters>) => {
    setFilters((prev) => sanitizeFilters({ ...prev, ...partial }));
  }, []);

  const triggerSearch = useCallback((override?: Partial<TransactionFilters>) => {
    const nextFilters = sanitizeFilters({
      ...filters,
      ...override,
      page: override?.page ?? 0,
    });
    runSearch(nextFilters);
  }, [filters, runSearch]);

  const searchWithFilters = useCallback((nextFilters: TransactionFilters) => {
    runSearch({
      ...sanitizeFilters(nextFilters),
      page: 0,
    }, { forceRefetch: true });
  }, [runSearch]);

  const resetFilters = useCallback(() => {
    searchParamSyncActionRef.current = searchParams.toString() ? 'reset' : null;
    setFilters(DEFAULT_FILTERS);
    setSubmittedFilters(DEFAULT_FILTERS);
    setHasSearched(false);
    setElapsedMs(null);
    setSelectedTransactionIds([]);
    setSearchParams(new URLSearchParams());
  }, [searchParams, setSearchParams]);

  const saveCurrentSearch = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    setSavedSearches((prev) => {
      const filtersToStore = sanitizeFilters(filters);
      const deduped = prev.filter((entry) => entry.name !== trimmedName);
      const updated = [
        {
          id: createClientId('saved-search'),
          name: trimmedName,
          filters: filtersToStore,
          createdAt: new Date().toISOString(),
        },
        ...deduped,
      ].slice(0, 10);
      persistStoredItems(SAVED_SEARCHES_STORAGE_KEY, updated);
      return updated;
    });
  }, [filters]);

  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches((prev) => {
      const updated = prev.filter((entry) => entry.id !== id);
      persistStoredItems(SAVED_SEARCHES_STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  const applySavedSearch = useCallback((id: string) => {
    const saved = savedSearches.find((entry) => entry.id === id);
    if (!saved) return;
    searchWithFilters(saved.filters);
  }, [savedSearches, searchWithFilters]);

  const applyRecentSearch = useCallback((id: string) => {
    const recent = recentSearches.find((entry) => entry.id === id);
    if (!recent) return;
    searchWithFilters(recent.filters);
  }, [recentSearches, searchWithFilters]);

  const setPage = useCallback((page: number) => {
    setFilters((prev) => {
      const next = sanitizeFilters({ ...prev, page });
      if (hasSearched) setSearchParams(toSearchParams(next));
      return next;
    });
    setSubmittedFilters((prev) => sanitizeFilters({ ...prev, page }));
    setSelectedTransactionIds([]);
  }, [hasSearched, setSearchParams]);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => {
      const next = sanitizeFilters({ ...prev, page: 0, pageSize });
      if (hasSearched) setSearchParams(toSearchParams(next));
      return next;
    });
    setSubmittedFilters((prev) => sanitizeFilters({ ...prev, page: 0, pageSize }));
    setSelectedTransactionIds([]);
  }, [hasSearched, setSearchParams]);

  const setSort = useCallback((sortBy: TransactionSortField, sortDirection: TransactionSortDirection) => {
    setFilters((prev) => {
      const next = sanitizeFilters({ ...prev, sortBy, sortDirection, page: 0 });
      if (hasSearched) setSearchParams(toSearchParams(next));
      return next;
    });
    setSubmittedFilters((prev) => sanitizeFilters({ ...prev, sortBy, sortDirection, page: 0 }));
    setSelectedTransactionIds([]);
  }, [hasSearched, setSearchParams]);

  const toggleTransactionSelection = useCallback((transactionId: string) => {
    setSelectedTransactionIds((prev) =>
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTransactionIds([]);
  }, []);

  const allVisibleSelected = useMemo(
    () => transactions.length > 0 && transactions.every((transaction) => selectedTransactionIds.includes(String(transaction.id))),
    [selectedTransactionIds, transactions],
  );

  const someVisibleSelected = useMemo(
    () => !allVisibleSelected && transactions.some((transaction) => selectedTransactionIds.includes(String(transaction.id))),
    [allVisibleSelected, selectedTransactionIds, transactions],
  );

  const toggleAllVisibleTransactions = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedTransactionIds([]);
      return;
    }
    setSelectedTransactionIds(transactions.map((transaction) => String(transaction.id)));
  }, [allVisibleSelected, transactions]);

  const selectedTransactions = useMemo(
    () => transactions.filter((transaction) => selectedTransactionIds.includes(String(transaction.id))),
    [selectedTransactionIds, transactions],
  );

  return {
    filters,
    appliedFilters: submittedFilters,
    updateFilters,
    triggerSearch,
    searchWithFilters,
    resetFilters,
    setPage,
    setPageSize,
    setSort,
    transactions,
    summary,
    previousSummary,
    comparisonPeriodLabel,
    isLoading,
    isFetching,
    isRefreshing: isFetching && !isLoading,
    isError,
    error,
    refetch,
    elapsedMs,
    hasSearched,
    isReady,
    savedSearches,
    recentSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    applySavedSearch,
    applyRecentSearch,
    selectedTransactionIds,
    selectedTransactions,
    allVisibleSelected,
    someVisibleSelected,
    toggleTransactionSelection,
    toggleAllVisibleTransactions,
    clearSelection,
  };
}
