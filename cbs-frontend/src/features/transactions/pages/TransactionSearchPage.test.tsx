import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransactionSearchPage } from './TransactionSearchPage';

const { useTransactionSearch } = vi.hoisted(() => ({
  useTransactionSearch: vi.fn(),
}));

vi.mock('../hooks/useTransactionSearch', () => ({
  useTransactionSearch,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const baseHookValue = {
  filters: {
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
  },
  appliedFilters: {
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
  },
  updateFilters: vi.fn(),
  triggerSearch: vi.fn(),
  searchWithFilters: vi.fn(),
  resetFilters: vi.fn(),
  setPage: vi.fn(),
  setPageSize: vi.fn(),
  transactions: [],
  summary: {
    totalResults: 0,
    totalDebit: 0,
    totalCredit: 0,
    netAmount: 0,
  },
  previousSummary: null,
  comparisonPeriodLabel: null,
  isLoading: false,
  isFetching: false,
  isRefreshing: false,
  isError: false,
  refetch: vi.fn(),
  elapsedMs: null,
  hasSearched: false,
  savedSearches: [],
  recentSearches: [],
  saveCurrentSearch: vi.fn(),
  deleteSavedSearch: vi.fn(),
  applySavedSearch: vi.fn(),
  applyRecentSearch: vi.fn(),
  selectedTransactionIds: [],
  selectedTransactions: [],
  allVisibleSelected: false,
  someVisibleSelected: false,
  toggleTransactionSelection: vi.fn(),
  toggleAllVisibleTransactions: vi.fn(),
  clearSelection: vi.fn(),
};

describe('TransactionSearchPage', () => {
  beforeEach(() => {
    useTransactionSearch.mockReturnValue(baseHookValue);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders workstation controls and sets the document title', () => {
    const wrapper = createWrapper();

    render(<TransactionSearchPage />, { wrapper });

    expect(document.title).toBe('Transaction History | CBS');
    expect(screen.getByRole('button', { name: /live mode off/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText('Saved Searches')).toBeInTheDocument();
  });

  it('renders the summary workstation when results exist', () => {
    const wrapper = createWrapper();
    useTransactionSearch.mockReturnValue({
      ...baseHookValue,
      hasSearched: true,
      elapsedMs: 84,
      transactions: [
        {
          id: '1',
          reference: 'TXN-001',
          type: 'PAYMENT',
          channel: 'WEB',
          status: 'COMPLETED',
          dateTime: '2026-03-21T10:00:00Z',
          valueDate: '2026-03-21',
          postingDate: '2026-03-21',
          fromAccount: '0123456789',
          fromAccountName: 'Alice',
          toAccount: '9876543210',
          toAccountName: 'Vendor',
          debitAmount: 15000,
          fee: 100,
          narration: 'Vendor payment',
          description: 'Vendor payment',
          runningBalance: 500000,
        },
      ],
      summary: {
        totalResults: 1,
        totalDebit: 15000,
        totalCredit: 0,
        netAmount: -15000,
      },
    });

    render(<TransactionSearchPage />, { wrapper });

    expect(screen.getByText(/found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByText('Avg Transaction Value')).toBeInTheDocument();
    expect(screen.getByText('Largest Transaction')).toBeInTheDocument();
  });
});
