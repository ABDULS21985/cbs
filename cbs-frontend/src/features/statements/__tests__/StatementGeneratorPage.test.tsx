import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { StatementGeneratorPage } from '../pages/StatementGeneratorPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAccounts = {
  content: [
    { id: 1, accountNumber: '0012345678', accountName: 'John Doe', currencyCode: 'NGN', customerId: 100 },
    { id: 2, accountNumber: '0098765432', accountName: 'Jane Corp Ltd', currencyCode: 'USD', customerId: 200 },
  ],
};

const mockStatement = {
  statementId: 'STMT-1-1234567890',
  accountId: 1,
  accountNumber: '0012345678',
  accountName: 'John Doe',
  currencyCode: 'NGN',
  fromDate: '2026-02-01',
  toDate: '2026-03-01',
  openingBalance: 500000.0,
  closingBalance: 750000.0,
  totalCredits: 400000.0,
  totalDebits: 150000.0,
  transactionCount: 5,
  transactions: [
    { transactionRef: 'TXN-001', date: '2026-02-05', narration: 'Salary Credit', type: 'CREDIT', amount: 250000, runningBalance: 750000 },
    { transactionRef: 'TXN-002', date: '2026-02-10', narration: 'ATM Withdrawal', type: 'DEBIT', amount: 50000, runningBalance: 700000 },
    { transactionRef: 'TXN-003', date: '2026-02-15', narration: 'Transfer In', type: 'CREDIT', amount: 150000, runningBalance: 850000 },
  ],
  generatedAt: '2026-03-22T10:00:00Z',
};

const mockCertificate = {
  accountId: 1,
  accountNumber: '0012345678',
  accountName: 'John Doe',
  currencyCode: 'NGN',
  currentBalance: 750000.0,
  availableBalance: 700000.0,
  accountStatus: 'ACTIVE',
  asOfDate: '2026-03-22',
  certificateRef: 'COB-1-1234567890',
  generatedAt: '2026-03-22T10:00:00Z',
};

const mockConfirmation = {
  accountId: 1,
  accountNumber: '0012345678',
  accountName: 'John Doe',
  accountType: 'CURRENT',
  currencyCode: 'NGN',
  accountStatus: 'ACTIVE',
  openedDate: '2020-01-15',
  branchCode: 'LG001',
  confirmationRef: 'ACL-1-1234567890',
  generatedAt: '2026-03-22T10:00:00Z',
};

const mockEmailResponse = {
  accountId: 1,
  accountNumber: '0012345678',
  emailAddress: 'customer@example.com',
  fromDate: '2026-02-01',
  toDate: '2026-03-01',
  status: 'SENT',
  message: 'Statement has been queued for delivery to customer@example.com',
  timestamp: '2026-03-22T10:05:00Z',
};

const mockDownload = {
  accountNumber: '0012345678',
  accountName: 'John Doe',
  currencyCode: 'NGN',
  fromDate: '2026-02-01',
  toDate: '2026-03-01',
  transactionCount: 5,
  format: 'PDF',
  generatedAt: '2026-03-22T10:05:00Z',
  downloadReady: true,
};

const mockSubscriptions: unknown[] = [];

function setupHandlers() {
  server.use(
    http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    http.post('/api/v1/statements/generate', () => HttpResponse.json(wrap(mockStatement))),
    http.get('/api/v1/statements/certificate', () => HttpResponse.json(wrap(mockCertificate))),
    http.get('/api/v1/statements/confirmation', () => HttpResponse.json(wrap(mockConfirmation))),
    http.post('/api/v1/statements/email', () => HttpResponse.json(wrap(mockEmailResponse))),
    http.get('/api/v1/statements/download', () => HttpResponse.json(wrap(mockDownload))),
    http.get('/api/v1/statements/subscriptions', () => HttpResponse.json(wrap(mockSubscriptions))),
    http.post('/api/v1/statements/subscriptions', () =>
      HttpResponse.json(wrap({ id: 1, accountId: '1', frequency: 'MONTHLY', delivery: 'EMAIL', format: 'PDF', email: 'test@example.com', active: true, nextDelivery: '2026-04-22', createdAt: '2026-03-22T10:00:00Z' }), { status: 201 }),
    ),
    http.post('/api/v1/statements/subscriptions/:id/delete', () =>
      HttpResponse.json(wrap({ id: '1', status: 'DELETED' })),
    ),
  );
}

describe('StatementGeneratorPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Statement Generator')).toBeInTheDocument();
  });

  it('renders empty state preview before generation', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('No statement generated')).toBeInTheDocument();
  });

  it('loads accounts into the selector', async () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    await waitFor(() => {
      expect(screen.getByText(/0012345678 — John Doe/)).toBeInTheDocument();
    });
    expect(screen.getByText(/0098765432 — Jane Corp/)).toBeInTheDocument();
  });

  it('renders statement type options', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Full Statement')).toBeInTheDocument();
    expect(screen.getByText('Mini Statement')).toBeInTheDocument();
    expect(screen.getByText('Interest Certificate')).toBeInTheDocument();
  });

  it('renders format selector buttons', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    const pdfButtons = screen.getAllByText('PDF');
    expect(pdfButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CSV').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Generate Statement button', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Generate Statement')).toBeInTheDocument();
  });

  it('renders Certificate of Balance action', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Certificate of Balance')).toBeInTheDocument();
  });

  it('renders confirmation letter section', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Account Confirmation Letter')).toBeInTheDocument();
    expect(screen.getByText('Generate Confirmation Letter')).toBeInTheDocument();
  });

  it('renders confirmation purpose selector', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Employer Verification')).toBeInTheDocument();
  });

  it('renders subscription section', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Statement Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Add Statement Subscription')).toBeInTheDocument();
  });

  it('generates statement and shows preview on submit', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    // Wait for accounts to load
    await waitFor(() => {
      expect(screen.getByText(/0012345678 — John Doe/)).toBeInTheDocument();
    });

    // Select account
    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');

    // Click generate
    await user.click(screen.getByText('Generate Statement'));

    // Wait for statement preview to appear
    await waitFor(() => {
      expect(screen.getByText('Statement generated successfully')).toBeInTheDocument();
    });
  });

  it('generates certificate of balance', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');

    await user.click(screen.getByText('Certificate of Balance'));

    await waitFor(() => {
      expect(screen.getByText('Certificate')).toBeInTheDocument();
    });
  });

  it('generates confirmation letter', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');

    await user.click(screen.getByText('Generate Confirmation Letter'));

    await waitFor(() => {
      expect(screen.getByText('Confirmation Letter')).toBeInTheDocument();
    });
  });

  it('opens subscription form when Add button is clicked', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await user.click(screen.getByText('Add Statement Subscription'));

    expect(screen.getByText('New Statement Subscription')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Quarterly')).toBeInTheDocument();
  });

  it('shows toast on statement generation failure', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
      http.post('/api/v1/statements/generate', () => HttpResponse.json({ success: false, error: 'fail' }, { status: 500 })),
      http.get('/api/v1/statements/subscriptions', () => HttpResponse.json(wrap([]))),
    );
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');
    await user.click(screen.getByText('Generate Statement'));

    await waitFor(() => {
      expect(screen.getByText('Failed to generate statement')).toBeInTheDocument();
    });
  });

  it('has print action on statement preview toolbar', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');
    await user.click(screen.getByText('Generate Statement'));

    await waitFor(() => {
      expect(screen.getByText('Print / Save PDF')).toBeInTheDocument();
    });
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
    expect(screen.getByText('Download CSV')).toBeInTheDocument();
    expect(screen.getByText('Download Excel')).toBeInTheDocument();
    expect(screen.getByText('Email to Customer')).toBeInTheDocument();
  });

  it('opens email dialog from preview toolbar', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');
    await user.click(screen.getByText('Generate Statement'));

    await waitFor(() => {
      expect(screen.getByText('Email to Customer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Email to Customer'));

    expect(screen.getByText('Email Statement')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('customer@example.com')).toBeInTheDocument();
  });

  it('validates email in email dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StatementGeneratorPage />);

    await waitFor(() => {
      expect(screen.getByText(/0012345678/)).toBeInTheDocument();
    });

    const select = screen.getAllByRole('combobox')[0];
    await user.selectOptions(select, '1');
    await user.click(screen.getByText('Generate Statement'));

    await waitFor(() => {
      expect(screen.getByText('Email to Customer')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Email to Customer'));
    await user.click(screen.getByText('Send Statement'));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('has account placeholder option in selector', () => {
    setupHandlers();
    renderWithProviders(<StatementGeneratorPage />);
    expect(screen.getByText('Select account...')).toBeInTheDocument();
  });
});
