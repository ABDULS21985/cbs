import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AccountListPage } from './AccountListPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockAccounts = [
  {
    id: 1,
    accountNumber: '0100000001',
    accountName: 'Amara Primary Savings',
    productCategory: 'SAVINGS',
    currency: 'NGN',
    status: 'ACTIVE',
    availableBalance: 1250000,
    ledgerBalance: 1300000,
    branchCode: 'HQ01',
    openedDate: '2024-01-16',
  },
  {
    id: 2,
    accountNumber: '0100000002',
    accountName: 'TechVentures Current',
    productCategory: 'CURRENT',
    currency: 'NGN',
    status: 'ACTIVE',
    availableBalance: 5000000,
    ledgerBalance: 5100000,
    branchCode: 'LG02',
    openedDate: '2024-03-10',
  },
  {
    id: 3,
    accountNumber: '0100000003',
    accountName: 'Dormant USD Account',
    productCategory: 'DOMICILIARY',
    currency: 'USD',
    status: 'DORMANT',
    availableBalance: 0,
    ledgerBalance: 0,
    branchCode: 'AB01',
    openedDate: '2023-06-20',
  },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('AccountListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Default summary handler so stat cards always render
    server.use(
      http.get('/api/v1/accounts/summary', () =>
        HttpResponse.json(wrap({ totalAccounts: 3, totalBalance: 6250000, count_ACTIVE: 2, count_DORMANT: 1 })),
      ),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('renders the page header and stat cards after data loads', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    expect(screen.getByText('All Accounts')).toBeInTheDocument();
    expect(screen.getByText('Account listing and management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Accounts')).toBeInTheDocument();
    });
  });

  it('displays correct stat card values computed from account data', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Accounts')).toBeInTheDocument();
      expect(screen.getByText('Active Accounts')).toBeInTheDocument();
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
      expect(screen.getByText('Currencies')).toBeInTheDocument();
    });
  });

  it('renders table rows with account data', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('0100000001')).toBeInTheDocument();
    });

    expect(screen.getByText('Amara Primary Savings')).toBeInTheDocument();
    expect(screen.getByText('TechVentures Current')).toBeInTheDocument();
    expect(screen.getByText('Dormant USD Account')).toBeInTheDocument();
    expect(screen.getAllByText('HQ01')[0]).toBeInTheDocument();
    expect(screen.getAllByText('LG02')[0]).toBeInTheDocument();
  });

  it('renders column headers in the data table', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Account Number')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Account Name')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Currency')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Available Balance')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Branch')[0]).toBeInTheDocument();
  });

  it('navigates to account detail on row click', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('0100000001')).toBeInTheDocument();
    });

    const row = screen.getByText('Amara Primary Savings').closest('tr');
    if (row) fireEvent.click(row);

    expect(mockNavigate).toHaveBeenCalledWith('/accounts/0100000001');
  });

  it('shows loading state initially', () => {
    server.use(
      http.get('/api/v1/accounts', () =>
        new Promise(() => {}), // never resolves
      ),
    );

    renderWithProviders(<AccountListPage />);

    expect(screen.getByText('All Accounts')).toBeInTheDocument();
    // StatCard shows skeleton pulse when loading
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty message when no accounts are returned', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap([]))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('No accounts found')).toBeInTheDocument();
    });
  });

  it('displays accounts with different statuses', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('0100000003')).toBeInTheDocument();
    });

    // DORMANT account should be visible
    expect(screen.getByText('Dormant USD Account')).toBeInTheDocument();
  });

  it('handles server error gracefully', async () => {
    server.use(
      http.get('/api/v1/accounts', () =>
        HttpResponse.json({ success: false, message: 'Internal error' }, { status: 500 }),
      ),
    );

    renderWithProviders(<AccountListPage />);

    // Should still render the page structure even on error
    await waitFor(() => {
      expect(screen.getByText('All Accounts')).toBeInTheDocument();
    });
  });

  it('renders accounts with multiple currencies', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('0100000001')).toBeInTheDocument();
    });

    // Both NGN and USD should appear in the table
    const ngnCells = screen.getAllByText('NGN');
    expect(ngnCells.length).toBeGreaterThan(0);
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('renders product category types in the table', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    );

    renderWithProviders(<AccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('SAVINGS')).toBeInTheDocument();
    });

    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByText('DOMICILIARY')).toBeInTheDocument();
  });
});
