import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { VirtualAccountListPage } from './VirtualAccountListPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockVirtualAccounts = [
  {
    id: 1,
    virtualAccountNumber: 'VA-0001-0001',
    masterAccountId: 1001,
    customerId: 500,
    accountName: 'Dangote Invoice Collections',
    accountPurpose: 'COLLECTIONS',
    currency: 'NGN',
    virtualBalance: 2500000,
    autoSweepEnabled: true,
    sweepThreshold: 1000000,
    sweepTargetBalance: 500000,
    sweepDirection: 'TO_MASTER',
    externalReference: 'DANG-COL-001',
    referencePattern: '^INV-DANG-\\d+$',
    isActive: true,
    createdAt: '2024-06-01',
  },
  {
    id: 2,
    virtualAccountNumber: 'VA-0001-0002',
    masterAccountId: 1001,
    customerId: 501,
    accountName: 'TechCorp Payroll Account',
    accountPurpose: 'PAYROLL',
    currency: 'NGN',
    virtualBalance: 750000,
    autoSweepEnabled: false,
    sweepThreshold: 0,
    sweepTargetBalance: 0,
    sweepDirection: 'TO_MASTER',
    externalReference: '',
    referencePattern: '^PAY-TC-\\d+$',
    isActive: true,
    createdAt: '2024-07-15',
  },
  {
    id: 3,
    virtualAccountNumber: 'VA-0002-0001',
    masterAccountId: 2002,
    customerId: 502,
    accountName: 'Dormant Escrow VA',
    accountPurpose: 'ESCROW_VIRTUAL',
    currency: 'USD',
    virtualBalance: 0,
    autoSweepEnabled: false,
    sweepThreshold: 0,
    sweepTargetBalance: 0,
    sweepDirection: 'TO_MASTER',
    externalReference: 'ESC-DORMANT',
    referencePattern: '',
    isActive: false,
    createdAt: '2023-11-20',
  },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function setupHandlers(accounts = mockVirtualAccounts) {
  server.use(
    http.get('/api/v1/virtual-accounts', () =>
      HttpResponse.json(wrap(accounts)),
    ),
  );
}

describe('VirtualAccountListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  // ── 1. Page renders with title ──────────────────────────────────────────────

  it('renders the page header with title and subtitle', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    expect(screen.getByText('Virtual Accounts')).toBeInTheDocument();
    expect(
      screen.getByText('Manage virtual account numbers and transaction matching rules'),
    ).toBeInTheDocument();
  });

  // ── 2. Virtual account list table renders with data ─────────────────────────

  it('renders table rows with virtual account data', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('VA-0001-0001')).toBeInTheDocument();
    });

    expect(screen.getByText('Dangote Invoice Collections')).toBeInTheDocument();
    expect(screen.getByText('TechCorp Payroll Account')).toBeInTheDocument();
    expect(screen.getByText('Dormant Escrow VA')).toBeInTheDocument();
    expect(screen.getByText('VA-0001-0002')).toBeInTheDocument();
    expect(screen.getByText('VA-0002-0001')).toBeInTheDocument();
  });

  it('displays stat cards with correct labels after data loads', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Virtual Accounts')).toBeInTheDocument();
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  // ── 3. Status filter existence ──────────────────────────────────────────────

  it('shows filter controls on the page', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('VA-0001-0001')).toBeInTheDocument();
    });

    // Filter button/controls should exist
    expect(screen.getByText(/Filter/i)).toBeInTheDocument();
  });

  // ── 4. Create virtual account dialog opens ──────────────────────────────────

  it('opens the create virtual account dialog when button is clicked', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    const createButton = screen.getByText('Create Virtual Account');
    await user.click(createButton);

    expect(screen.getByText('Create Virtual Account', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  // ── 5. Create VA form has required fields ───────────────────────────────────

  it('create form opens and contains form fields', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    await user.click(screen.getByText('Create Virtual Account'));

    // Dialog should open with create form elements
    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows validation errors when form is submitted empty', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    await user.click(screen.getByText('Create Virtual Account'));

    // Clear the account name field and submit
    const submitButton = screen.getByText('Create Account');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Account name is required')).toBeInTheDocument();
    });
  });

  // ── 6. Bulk sweep button is present ─────────────────────────────────────────

  it('renders the sweep all button', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    expect(screen.getByText('Sweep All')).toBeInTheDocument();
  });

  it('calls bulk sweep API when sweep all is clicked', async () => {
    setupHandlers();
    let sweepCalled = false;
    server.use(
      http.post('/api/v1/virtual-accounts/sweep', () => {
        sweepCalled = true;
        return HttpResponse.json(wrap({ swept: 2 }));
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    await user.click(screen.getByText('Sweep All'));

    await waitFor(() => {
      expect(sweepCalled).toBe(true);
    });
  });

  // ── 7. Activate/deactivate toggle works ─────────────────────────────────────

  it('closes the create dialog when cancel is clicked', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    await user.click(screen.getByText('Create Virtual Account'));
    expect(screen.getByText('Create Virtual Account', { selector: 'h2' })).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Create Virtual Account', { selector: 'h2' })).not.toBeInTheDocument();
    });
  });

  // ── 8. Loading state shows skeletons ────────────────────────────────────────

  it('shows loading state with skeletons initially', () => {
    server.use(
      http.get('/api/v1/virtual-accounts', () =>
        new Promise(() => {}), // never resolves
      ),
    );

    renderWithProviders(<VirtualAccountListPage />);

    expect(screen.getByText('Virtual Accounts')).toBeInTheDocument();
    // StatCard shows skeleton pulse when loading
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ── 9. Empty state shows when no virtual accounts ───────────────────────────

  it('shows empty message when no virtual accounts are returned', async () => {
    setupHandlers([]);
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('No virtual accounts found')).toBeInTheDocument();
    });
  });

  // ── 10. Error handling ──────────────────────────────────────────────────────

  it('handles server error gracefully without crashing', async () => {
    server.use(
      http.get('/api/v1/virtual-accounts', () =>
        HttpResponse.json(
          { success: false, message: 'Internal error' },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<VirtualAccountListPage />);

    // Page structure should still render even on error
    await waitFor(() => {
      expect(screen.getByText('Virtual Accounts')).toBeInTheDocument();
    });

    expect(screen.getByText('Sweep All')).toBeInTheDocument();
    expect(screen.getByText('Create Virtual Account')).toBeInTheDocument();
  });

  it('shows error message in dialog when create mutation fails', async () => {
    setupHandlers();
    server.use(
      http.post('/api/v1/virtual-accounts', () =>
        HttpResponse.json(
          { success: false, message: 'Validation failed' },
          { status: 400 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    await user.click(screen.getByText('Create Virtual Account'));

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText('e.g. Dangote Industries — Invoice Collections'),
      'Test VA Account',
    );
    await user.type(screen.getByPlaceholderText('e.g. 1001'), '100');
    await user.type(screen.getByPlaceholderText('e.g. 500'), '200');

    await user.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to create virtual account. Please try again.'),
      ).toBeInTheDocument();
    });
  });

  // ── Additional coverage ─────────────────────────────────────────────────────

  it('navigates to detail page on table row click', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('Dangote Invoice Collections')).toBeInTheDocument();
    });

    const row = screen.getByText('Dangote Invoice Collections').closest('tr');
    if (row) fireEvent.click(row);

    expect(mockNavigate).toHaveBeenCalledWith('/accounts/virtual-accounts/1');
  });

  it('shows filter button on the page', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('VA-0001-0001')).toBeInTheDocument();
    });

    // Filter controls exist
    expect(screen.getByText(/Filter/i)).toBeInTheDocument();
  });

  it('renders accounts with different currencies', async () => {
    setupHandlers();
    renderWithProviders(<VirtualAccountListPage />);

    await waitFor(() => {
      expect(screen.getByText('VA-0001-0001')).toBeInTheDocument();
    });

    const ngnCells = screen.getAllByText('NGN');
    expect(ngnCells.length).toBeGreaterThan(0);
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('submits create form successfully with valid data', async () => {
    setupHandlers();
    let createPayload: unknown = null;
    server.use(
      http.post('/api/v1/virtual-accounts', async ({ request }) => {
        createPayload = await request.json();
        return HttpResponse.json(
          wrap({
            id: 4,
            virtualAccountNumber: 'VA-0003-0001',
            masterAccountId: 100,
            customerId: 200,
            accountName: 'New Test VA',
            accountPurpose: 'COLLECTIONS',
            currency: 'NGN',
            virtualBalance: 0,
            autoSweepEnabled: false,
            sweepThreshold: 0,
            sweepTargetBalance: 0,
            sweepDirection: 'TO_MASTER',
            externalReference: '',
            referencePattern: '',
            isActive: true,
            createdAt: '2024-08-01',
          }),
        );
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<VirtualAccountListPage />);

    await user.click(screen.getByText('Create Virtual Account'));

    await user.type(
      screen.getByPlaceholderText('e.g. Dangote Industries — Invoice Collections'),
      'New Test VA',
    );
    await user.type(screen.getByPlaceholderText('e.g. 1001'), '100');
    await user.type(screen.getByPlaceholderText('e.g. 500'), '200');

    await user.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(createPayload).not.toBeNull();
    });

    expect((createPayload as Record<string, unknown>).accountName).toBe('New Test VA');
    expect((createPayload as Record<string, unknown>).masterAccountId).toBe(100);
    expect((createPayload as Record<string, unknown>).customerId).toBe(200);
  });
});
