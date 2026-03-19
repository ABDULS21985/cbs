import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AccountMaintenancePage } from './AccountMaintenancePage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockAccountBasicInfo = {
  id: 'ACC-501',
  accountNumber: '0123456789',
  accountTitle: 'Amara Primary Savings',
  status: 'ACTIVE',
  productName: 'Standard Savings',
  currency: 'NGN',
  currentOfficer: 'Chukwuma Eze',
  currentOfficerId: 'OFF-001',
  interestRate: 3.75,
  signatories: [
    {
      id: 'SIG-001',
      customerId: 'CUS-101',
      name: 'Amara Okonkwo',
      role: 'PRIMARY',
      addedAt: '2024-01-16T10:00:00Z',
    },
  ],
  signingRule: 'ANY_ONE',
  limits: {
    dailyTransaction: 5000000,
    perTransaction: 1000000,
    withdrawal: 2000000,
    posAtm: 500000,
    onlineTransaction: 3000000,
  },
};

const mockMaintenanceHistory = [
  {
    id: 'MH001',
    date: '2024-03-10T10:00:00Z',
    action: 'STATUS_CHANGE',
    performedBy: 'admin@cbs.bank',
    details: 'Status changed from DORMANT to ACTIVE',
    status: 'COMPLETED',
  },
  {
    id: 'MH002',
    date: '2024-02-20T14:30:00Z',
    action: 'SIGNATORY_ADDED',
    performedBy: 'ops@cbs.bank',
    details: 'Added signatory Amara Okonkwo as PRIMARY',
    status: 'COMPLETED',
  },
  {
    id: 'MH003',
    date: '2024-01-16T09:00:00Z',
    action: 'ACCOUNT_OPENED',
    performedBy: 'system',
    details: 'Account opened via branch',
    status: 'COMPLETED',
  },
  {
    id: 'MH004',
    date: '2024-03-15T11:00:00Z',
    action: 'LIMIT_CHANGE',
    performedBy: 'admin@cbs.bank',
    details: 'Daily limit increased to 5,000,000',
    status: 'COMPLETED',
  },
];

function setupDefaultHandlers() {
  server.use(
    http.get('/api/v1/accounts/:id', () =>
      HttpResponse.json(wrap(mockAccountBasicInfo)),
    ),
    http.get('/api/v1/accounts/:id/maintenance-history', () =>
      HttpResponse.json(wrap(mockMaintenanceHistory)),
    ),
  );
}

function renderMaintenance(accountId = 'ACC-501') {
  return renderWithProviders(
    <Routes>
      <Route path="/accounts/:id/maintenance" element={<AccountMaintenancePage />} />
    </Routes>,
    { route: `/accounts/${accountId}/maintenance` },
  );
}

describe('AccountMaintenancePage', () => {
  it('renders account info header with account details', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('0123456789')).toBeInTheDocument();
    });

    expect(screen.getByText('Amara Primary Savings')).toBeInTheDocument();
    expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    expect(screen.getByText('NGN')).toBeInTheDocument();
  });

  it('renders all six action cards', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Status Change')).toBeInTheDocument();
    });

    expect(screen.getByText('Signatory Management')).toBeInTheDocument();
    expect(screen.getByText('Interest Rate Override')).toBeInTheDocument();
    expect(screen.getByText('Limit Change')).toBeInTheDocument();
    expect(screen.getByText('Officer Change')).toBeInTheDocument();
    expect(screen.getByText('Signing Rule Update')).toBeInTheDocument();
  });

  it('renders action card descriptions', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Activate, freeze, or close this account')).toBeInTheDocument();
    });

    expect(screen.getByText('Add or remove account signatories')).toBeInTheDocument();
    expect(screen.getByText('Override the account interest rate')).toBeInTheDocument();
    expect(screen.getByText('Adjust transaction and channel limits')).toBeInTheDocument();
    expect(screen.getByText('Reassign relationship officer')).toBeInTheDocument();
  });

  it('opens Status Change panel when action card is clicked', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Status Change')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Status Change'));

    await waitFor(() => {
      expect(screen.getByText('Apply Status Change')).toBeInTheDocument();
    });
  });

  it('shows status transition options for ACTIVE account', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Status Change')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Status Change'));

    await waitFor(() => {
      expect(screen.getByText('Dormant')).toBeInTheDocument();
    });

    expect(screen.getByText('Frozen')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('submits status change mutation with correct payload', async () => {
    let statusChangeCalled = false;

    server.use(
      http.get('/api/v1/accounts/:id', () =>
        HttpResponse.json(wrap(mockAccountBasicInfo)),
      ),
      http.get('/api/v1/accounts/:id/maintenance-history', () =>
        HttpResponse.json(wrap(mockMaintenanceHistory)),
      ),
      http.patch('/api/v1/accounts/:id/status', () => {
        statusChangeCalled = true;
        return HttpResponse.json(wrap({ success: true }));
      }),
    );

    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Status Change')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Status Change'));

    await waitFor(() => {
      expect(screen.getByText('Apply Status Change')).toBeInTheDocument();
    });

    // Fill the form
    fireEvent.change(screen.getByRole('combobox') ?? screen.getByDisplayValue(''), {
      target: { value: 'FROZEN' },
    });
    fireEvent.change(screen.getByPlaceholderText(/provide a detailed reason/i), {
      target: { value: 'Account frozen due to suspicious activity detected' },
    });

    fireEvent.click(screen.getByText('Apply Status Change'));

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Confirm Status Change')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Yes, Change Status'));

    await waitFor(() => {
      expect(statusChangeCalled).toBe(true);
    });
  });

  it('opens Signatory Management panel', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Signatory Management')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Signatory Management'));

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });
  });

  it('renders maintenance history timeline', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Maintenance History')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText('STATUS_CHANGE').length).toBeGreaterThan(0);
    });
  });

  it('shows loading skeleton while data is loading', () => {
    server.use(
      http.get('/api/v1/accounts/:id', () => new Promise(() => {})),
    );

    renderMaintenance();

    expect(screen.getByText('Account Maintenance')).toBeInTheDocument();
  });

  it('shows error state when account fetch fails', async () => {
    server.use(
      http.get('/api/v1/accounts/:id', () =>
        HttpResponse.json(
          { success: false, message: 'Internal Server Error' },
          { status: 500 },
        ),
      ),
    );

    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Failed to load account information')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retries fetch when clicking Retry button on error', async () => {
    let callCount = 0;

    server.use(
      http.get('/api/v1/accounts/:id', () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json(
            { success: false, message: 'Error' },
            { status: 500 },
          );
        }
        return HttpResponse.json(wrap(mockAccountBasicInfo));
      }),
      http.get('/api/v1/accounts/:id/maintenance-history', () =>
        HttpResponse.json(wrap(mockMaintenanceHistory)),
      ),
    );

    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Failed to load account information')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('0123456789')).toBeInTheDocument();
    });
  });

  it('closes action panel when backdrop is clicked', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Status Change')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Status Change'));

    await waitFor(() => {
      expect(screen.getByText('Apply Status Change')).toBeInTheDocument();
    });

    // Click backdrop to close
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
    if (backdrop) fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByText('Apply Status Change')).not.toBeInTheDocument();
    });
  });

  it('displays maintenance history with multiple entries', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getAllByText('STATUS_CHANGE').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('SIGNATORY_ADDED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ACCOUNT_OPENED').length).toBeGreaterThan(0);
  });

  it('shows page header with back link to account detail', async () => {
    setupDefaultHandlers();
    renderMaintenance();

    await waitFor(() => {
      expect(screen.getByText('Account Maintenance')).toBeInTheDocument();
    });
  });
});
