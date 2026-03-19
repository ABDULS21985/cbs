import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AccountDetailPage } from './AccountDetailPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockAccountResponse = {
  id: 501,
  accountNumber: '0123456789',
  accountName: 'Amara Primary Savings',
  productName: 'Standard Savings',
  productCategory: 'SAVINGS',
  currency: 'NGN',
  status: 'ACTIVE',
  availableBalance: 125000,
  ledgerBalance: 125000,
  lienAmount: 2500,
  branchCode: 'HQ01',
  openedDate: '2024-01-16',
  relationshipManager: 'RM-001',
  customerId: 101,
  customerDisplayName: 'Amara Okonkwo',
  applicableInterestRate: 3.75,
  accruedInterest: 410.5,
  statementFrequency: 'MONTHLY',
  lastInterestCalcDate: '2026-03-18',
  lastInterestPostDate: '2026-02-28',
  signatories: [
    { customerDisplayName: 'Amara Okonkwo', signatoryType: 'PRIMARY' },
  ],
};

const mockTransactions = [
  {
    id: 9001,
    transactionRef: 'TXN-0001',
    transactionType: 'CREDIT',
    amount: 50000,
    currencyCode: 'NGN',
    runningBalance: 125000,
    narration: 'Opening deposit',
    valueDate: '2024-01-16',
    postingDate: '2024-01-16',
    channel: 'BRANCH',
    status: 'POSTED',
  },
  {
    id: 9002,
    transactionRef: 'TXN-0002',
    transactionType: 'TRANSFER_OUT',
    amount: 12500,
    currencyCode: 'NGN',
    runningBalance: 112500,
    narration: 'Transfer to beneficiary',
    valueDate: '2024-01-17',
    postingDate: '2024-01-17',
    channel: 'MOBILE',
    status: 'POSTED',
  },
];

const mockHolds = [
  {
    id: 'H001',
    reference: 'HOLD-001',
    amount: 2500,
    reason: 'Regulatory compliance check',
    placedBy: 'System',
    dateCreated: '2024-03-01',
    releaseDate: '2024-04-01',
    status: 'ACTIVE',
  },
  {
    id: 'H002',
    reference: 'HOLD-002',
    amount: 1000,
    reason: 'Fraud investigation',
    placedBy: 'Compliance Officer',
    dateCreated: '2024-02-15',
    status: 'RELEASED',
  },
];

const mockMaintenanceHistory = [
  {
    id: 'MH001',
    date: '2024-03-10T10:00:00Z',
    action: 'STATUS_CHANGE',
    performedBy: 'admin@cbs.bank',
    details: 'Status changed from DORMANT to ACTIVE',
    status: 'COMPLETED',
  },
];

function setupDefaultHandlers() {
  server.use(
    http.get('/api/v1/accounts/:id', () =>
      HttpResponse.json(wrap(mockAccountResponse)),
    ),
    http.get('/api/v1/accounts/:id/transactions', () =>
      HttpResponse.json(wrap(mockTransactions)),
    ),
    http.get('/api/v1/accounts/:id/holds', () =>
      HttpResponse.json(wrap(mockHolds)),
    ),
    http.get('/api/v1/accounts/:id/interest-history', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/accounts/:id/linked-products', () =>
      HttpResponse.json(wrap({ standingOrders: [], directDebits: [] })),
    ),
    http.get('/api/v1/accounts/:id/maintenance-history', () =>
      HttpResponse.json(wrap(mockMaintenanceHistory)),
    ),
  );
}

function renderDetail(route = '/accounts/0123456789') {
  return renderWithProviders(
    <Routes>
      <Route path="/accounts/:id" element={<AccountDetailPage />} />
    </Routes>,
    { route },
  );
}

async function waitForAccountLoad() {
  await waitFor(() => {
    expect(screen.getAllByText('Amara Primary Savings').length).toBeGreaterThan(0);
  });
}

describe('AccountDetailPage', () => {
  it('renders account header info and balance card on load', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    expect(screen.getAllByText('Standard Savings').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HQ01').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /initiate transfer/i })).toHaveAttribute('href', '/payments/new');
    expect(screen.getByRole('link', { name: /statements/i })).toHaveAttribute('href', '/accounts/statements');
  });

  it('shows loading skeleton while account data is being fetched', () => {
    server.use(
      http.get('/api/v1/accounts/:id', () => new Promise(() => {})),
    );

    renderDetail();

    expect(screen.getByText('Account Details')).toBeInTheDocument();
  });

  it('shows error state when account fetch fails with 500', async () => {
    server.use(
      http.get('/api/v1/accounts/:id', () =>
        HttpResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Account not found')).toBeInTheDocument();
    });

    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it('shows error state when account returns 404', async () => {
    server.use(
      http.get('/api/v1/accounts/:id', () =>
        HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 }),
      ),
    );

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Account not found')).toBeInTheDocument();
    });
  });

  it('renders the balance card with available, ledger, and hold amounts', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    expect(screen.getByText('Available Balance')).toBeInTheDocument();
    expect(screen.getByText('Ledger Balance')).toBeInTheDocument();
    expect(screen.getByText('Hold Amount')).toBeInTheDocument();
  });

  it('shows Overview tab content by default with account info', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    // Overview tab renders AccountDetailsTab which shows these sections
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('Relationship Manager')).toBeInTheDocument();
    expect(screen.getByText('RM-001')).toBeInTheDocument();
    expect(screen.getByText('Customer Name')).toBeInTheDocument();
    expect(screen.getAllByText('Amara Okonkwo').length).toBeGreaterThan(0);
  });

  it('switches to Transactions tab and shows transaction data', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /transactions/i }));

    await waitFor(() => {
      expect(screen.getByText('TXN-0001')).toBeInTheDocument();
    });

    expect(screen.getByText('Opening deposit')).toBeInTheDocument();
    expect(screen.getByText('Transfer to beneficiary')).toBeInTheDocument();
    expect(screen.getByText('TXN-0002')).toBeInTheDocument();
  });

  it('switches to Interest tab and shows interest parameters', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /interest/i }));

    await waitFor(() => {
      expect(screen.getByText('Interest Summary')).toBeInTheDocument();
      expect(screen.getByText('Statement Frequency')).toBeInTheDocument();
    });
  });

  it('switches to Holds tab and displays holds data', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /^holds$/i }));

    await waitFor(() => {
      expect(screen.getByText('HOLD-001')).toBeInTheDocument();
    });

    expect(screen.getByText('Regulatory compliance check')).toBeInTheDocument();
    expect(screen.getByText('HOLD-002')).toBeInTheDocument();
  });

  it('shows Release button for active holds and opens release dialog', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /^holds$/i }));

    await waitFor(() => {
      expect(screen.getByText('HOLD-001')).toBeInTheDocument();
    });

    // Click the Release button in the table row
    const releaseButtons = screen.getAllByRole('button', { name: /^release$/i });
    expect(releaseButtons.length).toBeGreaterThan(0);

    fireEvent.click(releaseButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Release Hold').length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText(/provide reason for releasing/i)).toBeInTheDocument();
    });
  });

  it('executes hold release mutation successfully', async () => {
    let releaseCalled = false;
    server.use(
      http.get('/api/v1/accounts/:id', () =>
        HttpResponse.json(wrap(mockAccountResponse)),
      ),
      http.get('/api/v1/accounts/:id/transactions', () =>
        HttpResponse.json(wrap(mockTransactions)),
      ),
      http.get('/api/v1/accounts/:id/holds', () =>
        HttpResponse.json(wrap(mockHolds)),
      ),
      http.post('/api/v1/accounts/:id/holds/:holdId/release', () => {
        releaseCalled = true;
        return HttpResponse.json(wrap({ success: true }));
      }),
    );

    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /^holds$/i }));

    await waitFor(() => {
      expect(screen.getByText('HOLD-001')).toBeInTheDocument();
    });

    const releaseButtons = screen.getAllByRole('button', { name: /^release$/i });
    fireEvent.click(releaseButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/provide reason for releasing/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/provide reason for releasing/i), {
      target: { value: 'Compliance check completed' },
    });

    // Click the "Release Hold" confirm button in the dialog
    const confirmButton = screen.getByRole('button', { name: /release hold/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(releaseCalled).toBe(true);
    });
  });

  it('switches to Audit tab and shows maintenance history', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /audit/i }));

    await waitFor(() => {
      expect(screen.getAllByText('STATUS_CHANGE').length).toBeGreaterThan(0);
    });
  });

  it('shows all six tab labels', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /interest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^holds$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /linked products/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /audit/i })).toBeInTheDocument();
  });

  it('shows empty holds message when there are no holds', async () => {
    server.use(
      http.get('/api/v1/accounts/:id', () =>
        HttpResponse.json(wrap(mockAccountResponse)),
      ),
      http.get('/api/v1/accounts/:id/transactions', () =>
        HttpResponse.json(wrap(mockTransactions)),
      ),
      http.get('/api/v1/accounts/:id/holds', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderDetail();

    await waitForAccountLoad();

    fireEvent.click(screen.getByRole('button', { name: /^holds$/i }));

    await waitFor(() => {
      expect(screen.getByText('No holds on this account')).toBeInTheDocument();
    });
  });

  it('shows signatory info in overview tab', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    // The AccountDetailsTab shows signatories section
    expect(screen.getByText('Signatories')).toBeInTheDocument();
    expect(screen.getByText('PRIMARY')).toBeInTheDocument();
  });

  it('displays interest parameters in overview tab', async () => {
    setupDefaultHandlers();
    renderDetail();

    await waitForAccountLoad();

    expect(screen.getByText('Interest Parameters')).toBeInTheDocument();
    expect(screen.getByText('Last Interest Posting')).toBeInTheDocument();
  });
});
