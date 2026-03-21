import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
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
  flaggedOnly: boolean;
  page: number;
  pageSize: number;
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
  return {
    ...DEFAULT_FILTERS,
    search: searchParams.get('q') ?? '',
    accountNumber: searchParams.get('acc') ?? '',
    dateFrom: searchParams.get('from') ?? '',
    dateTo: searchParams.get('to') ?? '',
    type: (searchParams.get('type') as TransactionFilters['type']) ?? DEFAULT_FILTERS.type,
    channel: (searchParams.get('ch') as TransactionFilters['channel']) ?? DEFAULT_FILTERS.channel,
    status: (searchParams.get('st') as TransactionFilters['status']) ?? DEFAULT_FILTERS.status,
    flaggedOnly: searchParams.get('flag') === '1',
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
    flaggedOnly: searchParams.get('flag') === '1',
  };
}

function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return ['q', 'acc', 'from', 'to', 'type', 'ch', 'st', 'flag'].some((key) => {
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
  if (filters.flaggedOnly) next.set('flag', '1');
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
    left.pageSize === right.pageSize
  );
}

function sanitizeFilters(filters: TransactionFilters): TransactionFilters {
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
    flaggedOnly: submittedFilters.flaggedOnly || undefined,
    page: submittedFilters.page,
    pageSize: submittedFilters.pageSize,
  }), [submittedFilters]);

  const previousPeriodFilters = useMemo(
    () => (hasSearched ? getPreviousPeriodFilters(submittedFilters) : null),
    [hasSearched, submittedFilters],
  );

  const previousPeriodQueryParams = useMemo<TransactionSearchParams | null>(() => {
    if (!previousPeriodFilters) return null;
    return {
      search: previousPeriodFilters.search || undefined,
      accountNumber: previousPeriodFilters.accountNumber || undefined,
      customerId: previousPeriodFilters.customerId || undefined,
      dateFrom: previousPeriodFilters.dateFrom || undefined,
      dateTo: previousPeriodFilters.dateTo || undefined,
      amountFrom: previousPeriodFilters.amountFrom > 0 ? previousPeriodFilters.amountFrom : undefined,
      amountTo: previousPeriodFilters.amountTo > 0 ? previousPeriodFilters.amountTo : undefined,
      type: previousPeriodFilters.type !== 'ALL' ? previousPeriodFilters.type : undefined,
      channel: previousPeriodFilters.channel !== 'ALL' ? previousPeriodFilters.channel : undefined,
      status: previousPeriodFilters.status !== 'ALL' ? previousPeriodFilters.status : undefined,
      flaggedOnly: previousPeriodFilters.flaggedOnly || undefined,
      page: 0,
      pageSize: 1,
    };
  }, [previousPeriodFilters]);

  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['transactions', 'search', submittedFilters],
    queryFn: async () => {
      lastFetchStartedAtRef.current = Date.now();
      return transactionApi.searchTransactions(queryParams);
    },
    enabled: hasSearched,
    staleTime: 30_000,
    refetchInterval: hasSearched && refreshIntervalMs ? refreshIntervalMs : false,
  });

  const { data: previousPeriodResult } = useQuery({
    queryKey: ['transactions', 'search', 'comparison', previousPeriodFilters],
    queryFn: () => transactionApi.searchTransactions(previousPeriodQueryParams!),
    enabled: Boolean(hasSearched && previousPeriodQueryParams),
    staleTime: 30_000,
  });

  const transactions: Transaction[] = data?.transactions ?? EMPTY_TRANSACTIONS;
  const summary: TransactionSummary = data?.summary ?? EMPTY_SUMMARY;
  const previousSummary: TransactionSummary | null = previousPeriodResult?.summary ?? null;

  const comparisonPeriodLabel = useMemo(() => {
    if (!previousPeriodFilters) return null;
    return `${previousPeriodFilters.dateFrom} to ${previousPeriodFilters.dateTo}`;
  }, [previousPeriodFilters]);

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
    setFilters((prev) => sanitizeFilters({ ...prev, page }));
    setSubmittedFilters((prev) => sanitizeFilters({ ...prev, page }));
    setSelectedTransactionIds([]);
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters((prev) => sanitizeFilters({ ...prev, page: 0, pageSize }));
    setSubmittedFilters((prev) => sanitizeFilters({ ...prev, page: 0, pageSize }));
    setSelectedTransactionIds([]);
  }, []);

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
    transactions,
    summary,
    previousSummary,
    comparisonPeriodLabel,
    isLoading,
    isFetching,
    isRefreshing: isFetching && !isLoading,
    isError,
    refetch,
    elapsedMs,
    hasSearched,
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
