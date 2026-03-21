import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { TransactionSearchPage } from '../pages/TransactionSearchPage';

const mocks = vi.hoisted(() => ({
  searchTransactions: vi.fn(),
  getTransaction: vi.fn(),
  reverseTransaction: vi.fn(),
  downloadReceipt: vi.fn(),
  exportToExcel: vi.fn(),
  exportToPdf: vi.fn(),
}));

vi.mock('../api/transactionApi', () => ({
  transactionApi: {
    searchTransactions: mocks.searchTransactions,
    getTransaction: mocks.getTransaction,
    reverseTransaction: mocks.reverseTransaction,
    downloadReceipt: mocks.downloadReceipt,
    previewReversal: vi.fn(),
    downloadReversalAdvice: vi.fn(),
    downloadStatement: vi.fn(),
    emailStatement: vi.fn(),
  },
}));

vi.mock('@/lib/export/excelExport', () => ({
  exportToExcel: mocks.exportToExcel,
}));

vi.mock('@/lib/export/pdfExport', () => ({
  exportToPdf: mocks.exportToPdf,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../components/StatementGenerator', () => ({
  StatementGenerator: () => null,
}));

vi.mock('../components/TransactionDetailModal', () => ({
  TransactionDetailModal: ({
    transaction,
    open,
  }: {
    transaction: { reference: string } | null;
    open: boolean;
  }) => open ? <div role="dialog">Detail modal for {transaction?.reference}</div> : null,
}));

type SearchResult = {
  transactions: Array<Record<string, unknown>>;
  summary: {
    totalResults: number;
    totalDebit: number;
    totalCredit: number;
    netAmount: number;
  };
};

const baseTransaction = {
  id: 'txn-1',
  reference: 'TXN-001',
  type: 'PAYMENT',
  channel: 'WEB',
  status: 'COMPLETED',
  dateTime: '2026-03-21T10:00:00Z',
  valueDate: '2026-03-21',
  postingDate: '2026-03-21',
  fromAccount: '0123456789',
  fromAccountName: 'Ada Obi',
  toAccount: '9876543210',
  toAccountName: 'Vendor One',
  debitAmount: 15000,
  creditAmount: 0,
  fee: 100,
  runningBalance: 250000,
  narration: 'Vendor payment',
  description: 'Vendor payment',
};

function makeResult(overrides?: Partial<SearchResult>): SearchResult {
  return {
    transactions: [baseTransaction],
    summary: {
      totalResults: 1,
      totalDebit: 15000,
      totalCredit: 0,
      netAmount: -15000,
    },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderPage(route = '/payments/history') {
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

  const router = createMemoryRouter(
    [
      {
        path: '/payments/history',
        element: <TransactionSearchPage />,
      },
    ],
    {
      initialEntries: [route],
    },
  );

  const user = userEvent.setup();
  return {
    user,
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

describe('TransactionSearchPage', () => {
  const originalCreateElement = document.createElement.bind(document);
  const RealURL = URL;
  const createObjectURL = vi.fn(() => 'blob:test');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchTransactions.mockResolvedValue(makeResult());
    mocks.getTransaction.mockResolvedValue(baseTransaction);
    class MockURL extends RealURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal('URL', MockURL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.createElement = originalCreateElement;
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders search form with all filter options', async () => {
    const { user } = renderPage();

    await screen.findByLabelText(/search query/i);
    await user.click(screen.getByRole('button', { name: /show filters/i }));

    expect(screen.getByLabelText(/account number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer id \/ name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument();
  });

  it('executes search on form submit and syncs filters to URL params', async () => {
    const { user, router } = renderPage();

    await screen.findByLabelText(/search query/i);
    await user.type(screen.getByLabelText(/search query/i), 'rent');
    await user.click(screen.getByRole('button', { name: /show filters/i }));
    await user.type(screen.getByLabelText(/account number/i), '0123456789');
    await user.click(screen.getByRole('button', { name: /search transactions/i }));

    await waitFor(() => {
      expect(mocks.searchTransactions).toHaveBeenCalledWith(expect.objectContaining({
        search: 'rent',
        accountNumber: '0123456789',
        sort: 'postingDate,desc',
      }), expect.anything());
    });

    await waitFor(() => {
      expect(router.state.location.search).toContain('q=rent');
      expect(router.state.location.search).toMatch(/acc=ref_/);
      expect(router.state.location.search).not.toContain('acc=0123456789');
    });
  });

  it('shows loading skeleton while fetching', async () => {
    const pending = deferred<SearchResult>();
    mocks.searchTransactions.mockReturnValueOnce(pending.promise);

    renderPage('/payments/history?q=rent');

    expect(await screen.findByRole('status', { name: /loading transactions/i })).toBeInTheDocument();

    pending.resolve(makeResult());
    expect(await screen.findByText('TXN-001')).toBeInTheDocument();
  });

  it('displays results table after successful search', async () => {
    renderPage('/payments/history?q=rent');

    expect(await screen.findByText('TXN-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open transaction txn-001/i })).toBeInTheDocument();
  });

  it('shows error banner on API failure with retry button', async () => {
    mocks.searchTransactions
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(makeResult());

    const { user } = renderPage('/payments/history?q=rent');

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(mocks.searchTransactions).toHaveBeenCalledTimes(2);
    });
  });

  it('shows summary bar with correct totals', async () => {
    renderPage('/payments/history?q=rent');

    expect(await screen.findByText('Total Debit')).toBeInTheDocument();
    expect(screen.getByText('Largest Transaction')).toBeInTheDocument();
    expect(screen.getByText('Most Active Channel')).toBeInTheDocument();
  });

  it('exports CSV when export button clicked', async () => {
    const click = vi.fn();
    const anchor = {
      click,
      set href(value: string) {
        this._href = value;
      },
      get href() {
        return this._href;
      },
      download: '',
      _href: '',
    } as unknown as HTMLAnchorElement;

    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return anchor;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement;

    const { user } = renderPage('/payments/history?q=rent');

    expect(await screen.findByText('TXN-001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^export$/i }));
    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(anchor.download).toMatch(/transactions-.*\.csv$/);
    expect(click).toHaveBeenCalled();
  });

  it('opens detail modal on row click', async () => {
    const { user } = renderPage('/payments/history?q=rent');

    const rowAction = await screen.findByRole('button', { name: /open transaction txn-001/i });
    await user.click(rowAction);

    expect(screen.getByRole('dialog')).toHaveTextContent('Detail modal for TXN-001');
  });

  it('restores filters from URL params on mount and auto-searches', async () => {
    const { user } = renderPage('/payments/history?q=rent&acc=0123456789&from=2026-03-01&to=2026-03-10&type=DEBIT&ch=WEB&st=COMPLETED&flag=1');

    await waitFor(() => {
      expect(mocks.searchTransactions).toHaveBeenCalledWith(expect.objectContaining({
        search: 'rent',
        accountNumber: '0123456789',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-10',
        type: 'DEBIT',
        channel: 'WEB',
        status: 'COMPLETED',
        flaggedOnly: true,
      }), expect.anything());
    });

    await user.click(screen.getByRole('button', { name: /show filters/i }));
    expect(screen.getByLabelText(/search query/i)).toHaveValue('rent');
    expect(screen.getByLabelText(/account number/i)).toHaveValue('0123456789');
    expect(screen.getByLabelText(/date from/i)).toHaveValue('2026-03-01');
    expect(screen.getByLabelText(/show flagged only/i)).toBeChecked();
  });

  it('shows empty state when no results found', async () => {
    mocks.searchTransactions.mockResolvedValueOnce(makeResult({
      transactions: [],
      summary: {
        totalResults: 0,
        totalDebit: 0,
        totalCredit: 0,
        netAmount: 0,
      },
    }));

    renderPage('/payments/history?q=missing');

    expect(await screen.findByText(/no transactions found/i)).toBeInTheDocument();
  });

  it('bulk select selects all rows and shows floating action bar', async () => {
    mocks.searchTransactions.mockResolvedValueOnce(makeResult({
      transactions: [
        baseTransaction,
        {
          ...baseTransaction,
          id: 'txn-2',
          reference: 'TXN-002',
        },
      ],
      summary: {
        totalResults: 2,
        totalDebit: 30000,
        totalCredit: 0,
        netAmount: -30000,
      },
    }));

    const { user } = renderPage('/payments/history?q=rent');

    expect(await screen.findByText('TXN-001')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /select all visible transactions/i }));

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export selected/i })).toBeInTheDocument();
  });
});
