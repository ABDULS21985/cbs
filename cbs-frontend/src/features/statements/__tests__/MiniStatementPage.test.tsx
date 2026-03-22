import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { MiniStatementPage } from '../pages/MiniStatementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAccounts = {
  content: [
    { id: 1, accountNumber: '0012345678', accountName: 'John Doe', currencyCode: 'NGN', customerId: 100 },
    { id: 2, accountNumber: '0098765432', accountName: 'Jane Corp Ltd', currencyCode: 'USD', customerId: 200 },
  ],
};

const mockMiniTransactions = [
  { id: 1, transactionRef: 'TXN-001', postingDate: '2026-03-20', narration: 'POS Purchase', transactionType: 'DEBIT', amount: 5000, runningBalance: 745000, currencyCode: 'NGN' },
  { id: 2, transactionRef: 'TXN-002', postingDate: '2026-03-19', narration: 'Transfer Credit', transactionType: 'CREDIT', amount: 100000, runningBalance: 750000, currencyCode: 'NGN' },
  { id: 3, transactionRef: 'TXN-003', postingDate: '2026-03-18', narration: 'ATM Withdrawal', transactionType: 'DEBIT', amount: 20000, runningBalance: 650000, currencyCode: 'NGN' },
  { id: 4, transactionRef: 'TXN-004', postingDate: '2026-03-17', narration: 'Bank Fee', transactionType: 'FEE_DEBIT', amount: 500, runningBalance: 670000, currencyCode: 'NGN' },
  { id: 5, transactionRef: 'TXN-005', postingDate: '2026-03-16', narration: 'Salary Credit', transactionType: 'CREDIT', amount: 300000, runningBalance: 670500, currencyCode: 'NGN' },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    http.get('/api/v1/portal/:customerId/accounts/:accountNumber/mini-statement', () =>
      HttpResponse.json(wrap(mockMiniTransactions)),
    ),
  );
}

describe('MiniStatementPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<MiniStatementPage />);
    expect(screen.getByText('Mini Statement')).toBeInTheDocument();
  });

  it('renders empty state before search', () => {
    setupHandlers();
    renderWithProviders(<MiniStatementPage />);
    expect(screen.getByText('Select an account')).toBeInTheDocument();
  });

  it('loads accounts into selector', async () => {
    setupHandlers();
    renderWithProviders(<MiniStatementPage />);
    await waitFor(() => {
      expect(screen.getByText(/0012345678 — John Doe/)).toBeInTheDocument();
    });
    expect(screen.getByText(/0098765432 — Jane Corp/)).toBeInTheDocument();
  });

  it('renders transaction count selector', () => {
    setupHandlers();
    renderWithProviders(<MiniStatementPage />);
    expect(screen.getByText('Last 5')).toBeInTheDocument();
    expect(screen.getByText('Last 10')).toBeInTheDocument();
    expect(screen.getByText('Last 50')).toBeInTheDocument();
  });

  it('renders Load button', () => {
    setupHandlers();
    renderWithProviders(<MiniStatementPage />);
    expect(screen.getByText('Load')).toBeInTheDocument();
  });

  it('does not load data when no account is selected', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<MiniStatementPage />);

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('Load')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Load'));

    // Should stay on the empty state since no account was selected
    expect(screen.queryByText('POS Purchase')).not.toBeInTheDocument();
    expect(screen.queryByText('No transactions found.')).not.toBeInTheDocument();
  });

  it('loads and displays mini statement transactions', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<MiniStatementPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678 — John Doe/)).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    await user.click(screen.getByText('Load'));

    await waitFor(() => {
      expect(screen.getByText('POS Purchase')).toBeInTheDocument();
    });
    expect(screen.getByText('Transfer Credit')).toBeInTheDocument();
    expect(screen.getByText('ATM Withdrawal')).toBeInTheDocument();
    expect(screen.getByText('Bank Fee')).toBeInTheDocument();
    expect(screen.getByText('Salary Credit')).toBeInTheDocument();
  });

  it('displays transaction type badges', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<MiniStatementPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getAllByRole('combobox')[0], '1');
    await user.click(screen.getByText('Load'));

    await waitFor(() => {
      // Transaction types are rendered with underscores replaced by spaces
      const badges = screen.getAllByText(/DEBIT|CREDIT/);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText('FEE DEBIT')).toBeInTheDocument();
  });

  it('displays transaction count footer', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<MiniStatementPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getAllByRole('combobox')[0], '1');
    await user.click(screen.getByText('Load'));

    await waitFor(() => {
      expect(screen.getByText(/5 recent transaction\(s\)/)).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
      http.get('/api/v1/portal/:customerId/accounts/:accountNumber/mini-statement', () =>
        HttpResponse.json({ success: false }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<MiniStatementPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getAllByRole('combobox')[0], '1');
    await user.click(screen.getByText('Load'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load mini statement.')).toBeInTheDocument();
    });
  });

  it('shows no transactions message for empty result', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
      http.get('/api/v1/portal/:customerId/accounts/:accountNumber/mini-statement', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<MiniStatementPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getAllByRole('combobox')[0], '1');
    await user.click(screen.getByText('Load'));

    await waitFor(() => {
      expect(screen.getByText('No transactions found.')).toBeInTheDocument();
    });
  });
});
