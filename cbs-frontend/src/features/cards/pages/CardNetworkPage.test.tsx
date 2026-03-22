import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardNetworkPage } from './CardNetworkPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockMemberships = [
  { id: 1, network: 'VISA', membershipType: 'PRINCIPAL', memberId: 'VIS-001', institutionName: 'DigiCore Bank', issuingEnabled: true, acquiringEnabled: true, settlementBic: 'DCBKNGLA', settlementCurrency: 'USD', pciDssCompliant: true, pciExpiryDate: '2027-12-31', annualFee: 50000, status: 'ACTIVE', effectiveFrom: '2024-01-01', effectiveTo: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, network: 'MASTERCARD', membershipType: 'PRINCIPAL', memberId: 'MC-001', institutionName: 'DigiCore Bank', issuingEnabled: true, acquiringEnabled: false, settlementBic: 'DCBKNGLA', settlementCurrency: 'USD', pciDssCompliant: true, pciExpiryDate: '2027-12-31', annualFee: 45000, status: 'ACTIVE', effectiveFrom: '2024-01-01', effectiveTo: null, createdAt: '2024-01-01T00:00:00Z' },
  { id: 3, network: 'VERVE', membershipType: 'AFFILIATE', memberId: 'VRV-001', institutionName: 'DigiCore Bank', issuingEnabled: true, acquiringEnabled: true, settlementBic: 'DCBKNGLA', settlementCurrency: 'NGN', pciDssCompliant: false, pciExpiryDate: null, annualFee: 20000, status: 'ACTIVE', effectiveFrom: '2024-06-01', effectiveTo: null, createdAt: '2024-06-01T00:00:00Z' },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });
  useAuthStore.setState({
    user: createMockUser(),
    accessToken: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cards/networks']}>
        <CardNetworkPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupHandlers(memberships = mockMemberships) {
  server.use(
    http.get('/api/v1/card-networks', () => HttpResponse.json(wrap(memberships))),
  );
}

describe('CardNetworkPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Card Network Memberships')).toBeInTheDocument();
  });

  it('renders Register Membership button', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Register Membership')).toBeInTheDocument();
  });

  it('renders stat cards with correct counts', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total Memberships')).toBeInTheDocument();
    });
    // VISA appears in stat card label AND in table — use getAllByText
    expect(screen.getAllByText('VISA').length).toBeGreaterThan(0);
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
    expect(screen.getByText('Verve')).toBeInTheDocument();
  });

  it('displays membership data in table', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('VISA').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('MASTERCARD')).toBeInTheDocument();
    expect(screen.getByText('VERVE')).toBeInTheDocument();
  });

  it('displays membership types correctly', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('PRINCIPAL').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('AFFILIATE')).toBeInTheDocument();
  });

  it('shows PCI-DSS compliance status', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Compliant').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Non-compliant')).toBeInTheDocument();
  });

  it('displays member IDs', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('VIS-001')).toBeInTheDocument();
    });
    expect(screen.getByText('MC-001')).toBeInTheDocument();
  });

  it('shows empty state when no memberships', async () => {
    setupHandlers([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No network memberships registered')).toBeInTheDocument();
    });
  });

  it('opens registration dialog on button click', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Register Network Membership')).toBeInTheDocument();
    });
  });

  it('registration dialog has correct membership type options', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Register Network Membership')).toBeInTheDocument();
    });
    // Check membership type dropdown has backend-aligned options
    const typeSelect = screen.getAllByRole('combobox').find(
      el => (el as HTMLSelectElement).value === 'PRINCIPAL'
    ) as HTMLSelectElement;
    expect(typeSelect).toBeTruthy();
    const options = Array.from(typeSelect.options).map(o => o.value);
    expect(options).toContain('PRINCIPAL');
    expect(options).toContain('ASSOCIATE');
    expect(options).toContain('AFFILIATE');
    expect(options).toContain('PROCESSOR');
    expect(options).toContain('AGENT');
    expect(options).toContain('SPONSOR');
  });

  it('registration dialog has institution name field', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Institution Name *')).toBeInTheDocument();
    });
  });

  it('registration dialog has effective from date field', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Effective From *')).toBeInTheDocument();
    });
  });

  it('register button is disabled when institution name is empty', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Register Network Membership')).toBeInTheDocument();
    });
    // The "Register" button inside dialog should be disabled (institution name is empty)
    const registerButtons = screen.getAllByText('Register');
    const dialogRegister = registerButtons[registerButtons.length - 1];
    expect(dialogRegister.closest('button')).toBeDisabled();
  });

  it('sends correct fields when registering', async () => {
    const captured: Record<string, unknown>[] = [];
    server.use(
      http.get('/api/v1/card-networks', () => HttpResponse.json(wrap([]))),
      http.post('/api/v1/card-networks', async ({ request }) => {
        const body = await request.json();
        captured.push(body as Record<string, unknown>);
        return HttpResponse.json(wrap({ id: 99, ...body }));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Register Network Membership')).toBeInTheDocument();
    });

    // Fill in institution name
    const institutionInput = screen.getByPlaceholderText('e.g. DigiCore Bank PLC');
    await user.type(institutionInput, 'Test Bank PLC');

    // Click register
    const registerButtons = screen.getAllByText('Register');
    await user.click(registerButtons[registerButtons.length - 1]);

    await waitFor(() => {
      expect(captured.length).toBeGreaterThan(0);
    });

    // Verify backend-aligned field names
    expect(captured[0]).toHaveProperty('network', 'VISA');
    expect(captured[0]).toHaveProperty('membershipType', 'PRINCIPAL');
    expect(captured[0]).toHaveProperty('institutionName', 'Test Bank PLC');
    expect(captured[0]).toHaveProperty('pciDssCompliant', true);
    expect(captured[0]).toHaveProperty('effectiveFrom');
    // Should NOT have old frontend-only fields
    expect(captured[0]).not.toHaveProperty('networkName');
    expect(captured[0]).not.toHaveProperty('binPrefix');
    expect(captured[0]).not.toHaveProperty('memberBankId');
  });

  it('closes dialog when Cancel is clicked', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Register Network Membership')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Register Network Membership')).not.toBeInTheDocument();
    });
  });

  it('has network dropdown with all supported networks', async () => {
    setupHandlers();
    renderPage();
    fireEvent.click(screen.getByText('Register Membership'));
    await waitFor(() => {
      expect(screen.getByText('Register Network Membership')).toBeInTheDocument();
    });
    const networkSelect = screen.getAllByRole('combobox').find(
      el => (el as HTMLSelectElement).value === 'VISA'
    ) as HTMLSelectElement;
    const options = Array.from(networkSelect.options).map(o => o.value);
    expect(options).toContain('VISA');
    expect(options).toContain('MASTERCARD');
    expect(options).toContain('VERVE');
    expect(options).toContain('AMEX');
    expect(options).toContain('UNIONPAY');
    expect(options).toContain('JCB');
    expect(options).toContain('INTERSWITCH');
  });
});
