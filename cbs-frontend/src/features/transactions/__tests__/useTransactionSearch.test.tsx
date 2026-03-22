import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Mock the API module — use vi.hoisted so the fn is available inside the factory
// ---------------------------------------------------------------------------
const { mockSearchTransactions } = vi.hoisted(() => ({
  mockSearchTransactions: vi.fn(),
}));

vi.mock('../api/transactionApi', () => ({
  transactionApi: {
    searchTransactions: mockSearchTransactions,
  },
}));

import { useTransactionSearch } from '../hooks/useTransactionSearch';

// ---------------------------------------------------------------------------
// Helper factory
// ---------------------------------------------------------------------------
function makeSearchResult(overrides?: object) {
  return {
    transactions: [
      {
        id: 1,
        reference: 'TXN-001',
        type: 'DEBIT',
        channel: 'WEB',
        status: 'COMPLETED',
        dateTime: '2026-03-20T09:00:00Z',
        valueDate: '2026-03-20',
        postingDate: '2026-03-20',
        narration: 'Test',
        description: 'Test',
      },
    ],
    summary: { totalResults: 1, totalDebit: 15000, totalCredit: 0, netAmount: -15000 },
    page: { page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true },
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useTransactionSearch', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exposes default filters on mount', () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    expect(result.current.filters.type).toBe('ALL');
    expect(result.current.filters.channel).toBe('ALL');
    expect(result.current.filters.status).toBe('ALL');
    expect(result.current.filters.flaggedOnly).toBe(false);
    expect(result.current.filters.page).toBe(0);
    expect(result.current.filters.pageSize).toBe(20);
    expect(result.current.filters.sortBy).toBe('postingDate');
    expect(result.current.filters.sortDirection).toBe('desc');
  });

  it('starts with no search results and hasSearched = false', () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  it('updateFilters merges partial changes without triggering a search', async () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ search: 'salary', type: 'CREDIT' });
    });

    expect(result.current.filters.search).toBe('salary');
    expect(result.current.filters.type).toBe('CREDIT');
    // A filter update alone does not trigger a search — hasSearched stays false
    expect(result.current.hasSearched).toBe(false);
    // The API should not have been called yet
    expect(mockSearchTransactions).not.toHaveBeenCalled();
  });

  it('triggerSearch fires the API with the current filters', async () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult());
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ search: 'rent', type: 'DEBIT' });
    });

    act(() => {
      result.current.triggerSearch();
    });

    await waitFor(() => expect(result.current.hasSearched).toBe(true));

    expect(mockSearchTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'rent', type: 'DEBIT' }),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('returns transaction results after a successful search', async () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult());
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => result.current.triggerSearch());

    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    expect(result.current.transactions[0].id).toBe(1);
    expect(result.current.summary.totalResults).toBe(1);
  });

  it('resetFilters clears search state and restores defaults', async () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult());
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ search: 'salary', type: 'CREDIT', dateFrom: '2026-01-01' });
    });
    act(() => result.current.triggerSearch());
    await waitFor(() => expect(result.current.hasSearched).toBe(true));

    act(() => result.current.resetFilters());

    expect(result.current.filters.search).toBe('');
    expect(result.current.filters.type).toBe('ALL');
    expect(result.current.filters.dateFrom).toBe('');
    expect(result.current.hasSearched).toBe(false);
  });

  it('setPage updates the page filter without resetting other filters', () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ search: 'vendor' });
      result.current.setPage(2);
    });

    expect(result.current.filters.page).toBe(2);
    expect(result.current.filters.search).toBe('vendor');
  });

  it('setPageSize resets page to 0 and updates pageSize', () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.setPage(3);
      result.current.setPageSize(50);
    });

    expect(result.current.filters.pageSize).toBe(50);
    expect(result.current.filters.page).toBe(0);
  });

  it('saveCurrentSearch persists to localStorage and appears in savedSearches', () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ search: 'payroll', type: 'CREDIT' });
    });
    act(() => {
      result.current.saveCurrentSearch('Payroll Credits');
    });

    expect(result.current.savedSearches).toHaveLength(1);
    expect(result.current.savedSearches[0].name).toBe('Payroll Credits');
    expect(result.current.savedSearches[0].filters.search).toBe('payroll');

    // Verify localStorage persisted
    const raw = localStorage.getItem('transactions:saved-searches');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored).toHaveLength(1);
    expect(stored[0].filters.type).toBe('CREDIT');
  });

  it('deleteSavedSearch removes the entry by id', () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult({ transactions: [] }));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ search: 'payroll' });
      result.current.saveCurrentSearch('Payroll');
    });

    const savedId = result.current.savedSearches[0]?.id;
    expect(savedId).toBeDefined();

    act(() => result.current.deleteSavedSearch(savedId));

    expect(result.current.savedSearches).toHaveLength(0);
  });

  it('sends flaggedOnly=true in the API request when the flag filter is active', async () => {
    mockSearchTransactions.mockResolvedValue(makeSearchResult());
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateFilters({ flaggedOnly: true });
    });

    act(() => {
      result.current.triggerSearch();
    });

    await waitFor(() => expect(result.current.hasSearched).toBe(true));

    expect(mockSearchTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ flaggedOnly: true }),
      expect.anything(),
    );
  });

  it('isError is true and transactions remain empty when the API rejects', async () => {
    mockSearchTransactions.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useTransactionSearch(), { wrapper: createWrapper() });

    act(() => result.current.triggerSearch());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.transactions).toEqual([]);
  });
});
