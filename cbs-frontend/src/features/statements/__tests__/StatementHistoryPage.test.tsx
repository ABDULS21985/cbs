import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { StatementHistoryPage } from '../pages/StatementHistoryPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAccounts = {
  content: [
    { id: 1, accountNumber: '0012345678', accountName: 'John Doe', currencyCode: 'NGN' },
    { id: 2, accountNumber: '0098765432', accountName: 'Jane Corp Ltd', currencyCode: 'USD' },
  ],
};

const mockStatement = {
  statementId: 'STMT-1-1234',
  accountNumber: '0012345678',
  accountName: 'John Doe',
  accountType: 'Current',
  currency: 'NGN',
  openingBalance: 500000,
  closingBalance: 750000,
  totalDebits: 150000,
  totalCredits: 400000,
  periodFrom: '2026-01-01',
  periodTo: '2026-03-22',
  generatedAt: '2026-03-22T10:00:00Z',
  transactions: [
    { id: 'txn-0-TXN001', date: '2026-01-15', reference: 'TXN001', description: 'Salary Credit', debit: undefined, credit: 250000, balance: 750000 },
    { id: 'txn-1-TXN002', date: '2026-02-01', reference: 'TXN002', description: 'ATM Withdrawal', debit: 50000, credit: undefined, balance: 700000 },
    { id: 'txn-2-TXN003', date: '2026-02-15', reference: 'TXN003', description: 'Transfer In', debit: undefined, credit: 150000, balance: 850000 },
  ],
  bankName: 'BellBank Nigeria PLC',
  bankAddress: '12 Marina Street, Lagos Island, Lagos, Nigeria',
  bankLicense: 'CBN/RC-003456',
  bankEmail: 'support@bellbank.ng',
  bankPhone: '0700-BELL-BANK',
};

const mockRawStatement = {
  statementId: 'STMT-1-1234',
  accountId: 1,
  accountNumber: '0012345678',
  accountName: 'John Doe',
  currencyCode: 'NGN',
  fromDate: '2026-01-01',
  toDate: '2026-03-22',
  openingBalance: 500000,
  closingBalance: 750000,
  totalCredits: 400000,
  totalDebits: 150000,
  transactionCount: 3,
  transactions: [
    { transactionRef: 'TXN001', date: '2026-01-15', narration: 'Salary Credit', type: 'CREDIT', amount: 250000, runningBalance: 750000 },
    { transactionRef: 'TXN002', date: '2026-02-01', narration: 'ATM Withdrawal', type: 'DEBIT', amount: 50000, runningBalance: 700000 },
    { transactionRef: 'TXN003', date: '2026-02-15', narration: 'Transfer In', type: 'CREDIT', amount: 150000, runningBalance: 850000 },
  ],
  generatedAt: '2026-03-22T10:00:00Z',
};

const mockDownload = {
  accountNumber: '0012345678',
  accountName: 'John Doe',
  currencyCode: 'NGN',
  fromDate: '2026-01-01',
  toDate: '2026-03-22',
  transactionCount: 3,
  format: 'PDF',
  generatedAt: '2026-03-22T10:05:00Z',
  downloadReady: true,
};

const mockEmailResponse = {
  accountId: 1,
  accountNumber: '0012345678',
  emailAddress: 'test@example.com',
  fromDate: '2026-01-01',
  toDate: '2026-03-22',
  status: 'SENT',
  message: 'Statement has been queued for delivery',
  timestamp: '2026-03-22T10:05:00Z',
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    http.post('/api/v1/statements/generate', () => HttpResponse.json(wrap(mockRawStatement))),
    http.get('/api/v1/statements/download', () => HttpResponse.json(wrap(mockDownload))),
    http.post('/api/v1/statements/email', () => HttpResponse.json(wrap(mockEmailResponse))),
  );
}

describe('StatementHistoryPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<StatementHistoryPage />);
    expect(screen.getByText('Statement History')).toBeInTheDocument();
  });

  it('renders empty state before search', () => {
    setupHandlers();
    renderWithProviders(<StatementHistoryPage />);
    expect(screen.getByText('Select an account and period')).toBeInTheDocument();
  });

  it('loads accounts into selector', async () => {
    setupHandlers();
    renderWithProviders(<StatementHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText(/0012345678 — John Doe/)).toBeInTheDocument();
    });
  });

  it('renders Load Statement button', () => {
    setupHandlers();
    renderWithProviders(<StatementHistoryPage />);
    expect(screen.getByText('Load Statement')).toBeInTheDocument();
  });

  it('validates account selection on submit', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      expect(screen.getByText('Select an account')).toBeInTheDocument();
    });
  });

  it('loads and displays statement data after search', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678 — John Doe/)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '1');
    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      expect(screen.getByText('Opening Balance')).toBeInTheDocument();
    });
    expect(screen.getByText('Closing Balance')).toBeInTheDocument();
    expect(screen.getByText('Total Debits')).toBeInTheDocument();
    expect(screen.getByText('Total Credits')).toBeInTheDocument();
  });

  it('displays transactions in table', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      expect(screen.getByText('Salary Credit')).toBeInTheDocument();
    });
    expect(screen.getByText('ATM Withdrawal')).toBeInTheDocument();
    expect(screen.getByText('Transfer In')).toBeInTheDocument();
  });

  it('shows download action buttons after loading', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      const pdfButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('PDF'));
      expect(pdfButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows email button and opens dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Email'));

    expect(screen.getByText('Email Statement')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('customer@example.com')).toBeInTheDocument();
  });

  it('displays transaction count footer', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      expect(screen.getByText(/3 transaction\(s\)/)).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
      http.post('/api/v1/statements/generate', () =>
        HttpResponse.json({ success: false, error: 'Server error' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<StatementHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole('combobox'), '1');
    await user.click(screen.getByText('Load Statement'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load statement.')).toBeInTheDocument();
    });
  });
});
