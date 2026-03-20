import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTransactionSearch } from './useTransactionSearch';

const { searchTransactions } = vi.hoisted(() => ({
  searchTransactions: vi.fn(),
}));

vi.mock('../api/transactionApi', () => ({
  transactionApi: {
    searchTransactions,
    getTransaction: vi.fn(),
    reverseTransaction: vi.fn(),
    downloadReceipt: vi.fn(),
  },
}));

function createWrapper(route = '/transactions') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const emptyResult = {
  transactions: [],
  summary: {
    totalResults: 0,
    totalDebit: 0,
    totalCredit: 0,
    netAmount: 0,
  },
};

describe('useTransactionSearch', () => {
  beforeEach(() => {
    searchTransactions.mockResolvedValue(emptyResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('boots from URL params and auto-runs the search', async () => {
    const wrapper = createWrapper('/transactions?q=rent&acc=0123456789&from=2026-03-01&to=2026-03-10&type=DEBIT&ch=WEB&st=COMPLETED');

    const { result } = renderHook(() => useTransactionSearch(false), { wrapper });

    await waitFor(() => {
      expect(searchTransactions).toHaveBeenCalledWith(expect.objectContaining({
        search: 'rent',
        accountNumber: '0123456789',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-10',
        type: 'DEBIT',
        channel: 'WEB',
        status: 'COMPLETED',
      }));
    });

    expect(result.current.hasSearched).toBe(true);
    expect(result.current.filters.search).toBe('rent');
    expect(result.current.filters.accountNumber).toBe('0123456789');
  });

  it('allows a manual search even when no URL params are present', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransactionSearch(false), { wrapper });

    expect(result.current.hasSearched).toBe(false);

    await act(async () => {
      result.current.triggerSearch();
    });

    await waitFor(() => {
      expect(searchTransactions).toHaveBeenCalledTimes(1);
    });

    expect(result.current.hasSearched).toBe(true);
    expect(searchTransactions).toHaveBeenCalledWith(expect.objectContaining({
      search: undefined,
      accountNumber: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 0,
      pageSize: 20,
    }));
  });

  it('refetches when the same search is triggered again', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransactionSearch(false), { wrapper });

    await act(async () => {
      result.current.triggerSearch();
    });

    await waitFor(() => {
      expect(searchTransactions).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.triggerSearch();
    });

    await waitFor(() => {
      expect(searchTransactions).toHaveBeenCalledTimes(2);
    });
  });
});
