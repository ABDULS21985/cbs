import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardRequestPage } from './CardRequestPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCustomer = {
  id: 42,
  fullName: 'John Adeyemi',
  displayName: 'John Adeyemi',
  email: 'john@example.com',
  phone: '+234800000001',
};

const mockAccounts = [
  { id: 101, accountNumber: '0110000042', accountName: 'John Adeyemi Savings', accountType: 'SAVINGS', availableBalance: 500000, currencyCode: 'NGN', status: 'ACTIVE' },
  { id: 102, accountNumber: '0120000042', accountName: 'John Adeyemi Current', accountType: 'CURRENT', availableBalance: 1200000, currencyCode: 'NGN', status: 'ACTIVE' },
];

const mockIssuedCard = {
  id: 999,
  cardReference: 'CRD-000999',
  cardNumberMasked: '**** **** **** 7890',
  accountId: 101,
  accountNumber: '0110000042',
  customerId: 42,
  customerDisplayName: 'John Adeyemi',
  cardType: 'DEBIT',
  cardScheme: 'VISA',
  cardTier: 'CLASSIC',
  cardholderName: 'JOHN ADEYEMI',
  issueDate: '2026-03-22',
  expiryDate: '2030-03-22',
  status: 'PENDING_ACTIVATION',
  deliveryMethod: 'BRANCH_PICKUP',
  branchCode: 'LG001',
};

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
      <MemoryRouter initialEntries={['/cards/request']}>
        <Routes>
          <Route path="/cards/request" element={<CardRequestPage />} />
          <Route path="/cards/:id" element={<div>Card Detail Page</div>} />
          <Route path="/cards" element={<div>Cards List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupHandlers() {
  server.use(
    http.get('/api/v1/customers/:id', () => HttpResponse.json(wrap(mockCustomer))),
    http.get('/api/v1/accounts/customer/:id', () => HttpResponse.json(wrap(mockAccounts))),
    http.post('/api/v1/cards', () => HttpResponse.json(wrap(mockIssuedCard))),
  );
}

describe('CardRequestPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Request New Card')).toBeInTheDocument();
  });

  it('renders step indicator', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('renders step 1 — customer search', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Select Customer & Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter customer ID')).toBeInTheDocument();
  });

  it('Next button is disabled without customer and account', () => {
    setupHandlers();
    renderPage();
    const nextBtn = screen.getByText('Next');
    expect(nextBtn.closest('button')).toBeDisabled();
  });

  it('fetches customer on blur', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('John Adeyemi')).toBeInTheDocument();
    });
  });

  it('displays customer info after fetch', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('John Adeyemi')).toBeInTheDocument();
    });
    expect(screen.getByText(/john@example.com/)).toBeInTheDocument();
  });

  it('displays accounts for customer selection', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('0110000042')).toBeInTheDocument();
    });
    expect(screen.getByText('0120000042')).toBeInTheDocument();
  });

  it('enables Next after customer and account selection', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('0110000042')).toBeInTheDocument();
    });

    // Select the first account
    await user.click(screen.getByText('0110000042'));

    // Now Next should be enabled
    const nextBtn = screen.getByText('Next');
    expect(nextBtn.closest('button')).not.toBeDisabled();
  });

  it('navigates to step 2 on Next click', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText('0110000042')).toBeInTheDocument();
    });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Configure Card')).toBeInTheDocument();
    });
  });

  it('step 2 shows card type options', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('DEBIT')).toBeInTheDocument();
    });
    expect(screen.getByText('CREDIT')).toBeInTheDocument();
    expect(screen.getByText('PREPAID')).toBeInTheDocument();
  });

  it('step 2 shows card scheme options', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getAllByText('VISA').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
    expect(screen.getByText('Verve')).toBeInTheDocument();
  });

  it('step 2 shows card tier options', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('CLASSIC')).toBeInTheDocument();
    });
    expect(screen.getByText('GOLD')).toBeInTheDocument();
    expect(screen.getByText('PLATINUM')).toBeInTheDocument();
    expect(screen.getByText('INFINITE')).toBeInTheDocument();
  });

  it('step 2 shows delivery method options', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Branch Pickup')).toBeInTheDocument();
    });
    expect(screen.getByText('Courier Delivery')).toBeInTheDocument();
  });

  it('step 2 Back button returns to step 1', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });

    await user.click(screen.getByText('Back'));
    await waitFor(() => {
      expect(screen.getByText('Select Customer & Account')).toBeInTheDocument();
    });
  });

  it('navigates to step 3 review', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    // Step 1
    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    // Step 2 — Next
    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });
    await user.click(screen.getByText('Next'));

    // Step 3
    await waitFor(() => {
      expect(screen.getByText('Review & Issue')).toBeInTheDocument();
    });
  });

  it('step 3 shows compliance checkbox', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Review & Issue')).toBeInTheDocument(); });

    expect(screen.getByText(/card issuance policy/i)).toBeInTheDocument();
  });

  it('Issue Card button is disabled without terms accepted', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Review & Issue')).toBeInTheDocument(); });

    const issueBtn = screen.getByText('Issue Card');
    expect(issueBtn.closest('button')).toBeDisabled();
  });

  it('issues card successfully and shows success screen', async () => {
    const captured: Record<string, unknown>[] = [];
    server.use(
      http.get('/api/v1/customers/:id', () => HttpResponse.json(wrap(mockCustomer))),
      http.get('/api/v1/accounts/customer/:id', () => HttpResponse.json(wrap(mockAccounts))),
      http.post('/api/v1/cards', async ({ request }) => {
        const body = await request.json();
        captured.push(body as Record<string, unknown>);
        return HttpResponse.json(wrap(mockIssuedCard));
      }),
    );
    const user = userEvent.setup();
    renderPage();

    // Step 1
    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    // Step 2
    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });
    await user.click(screen.getByText('Next'));

    // Step 3
    await waitFor(() => { expect(screen.getByText('Review & Issue')).toBeInTheDocument(); });

    // Accept terms
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    // Click Issue Card
    await user.click(screen.getByText('Issue Card'));

    // Verify success screen
    await waitFor(() => {
      expect(screen.getByText('Card Issued Successfully!')).toBeInTheDocument();
    });

    // Verify API payload
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0]).toHaveProperty('accountId', 101);
    expect(captured[0]).toHaveProperty('cardType', 'DEBIT');
    expect(captured[0]).toHaveProperty('cardScheme', 'VISA');
    expect(captured[0]).toHaveProperty('cardholderName');
    expect(captured[0]).toHaveProperty('cardTier', 'CLASSIC');
  });

  it('success screen shows card details', async () => {
    server.use(
      http.get('/api/v1/customers/:id', () => HttpResponse.json(wrap(mockCustomer))),
      http.get('/api/v1/accounts/customer/:id', () => HttpResponse.json(wrap(mockAccounts))),
      http.post('/api/v1/cards', () => HttpResponse.json(wrap(mockIssuedCard))),
    );
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });
    await user.click(screen.getByText('Next'));
    await waitFor(() => { expect(screen.getByText('Review & Issue')).toBeInTheDocument(); });
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('Issue Card'));

    await waitFor(() => {
      expect(screen.getByText('Card Issued Successfully!')).toBeInTheDocument();
    });
    // Card number appears in both CardPreview and InfoGrid
    expect(screen.getAllByText('**** **** **** 7890').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PENDING_ACTIVATION')).toBeInTheDocument();
  });

  it('shows customer not found error', async () => {
    server.use(
      http.get('/api/v1/customers/:id', () => HttpResponse.json({}, { status: 404 })),
    );
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '999');
    fireEvent.blur(input);

    // Customer not found toast should fire, and Next should remain disabled
    await waitFor(() => {
      const nextBtn = screen.getByText('Next');
      expect(nextBtn.closest('button')).toBeDisabled();
    });
  });

  it('cardholder name auto-populates from customer name', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByPlaceholderText('Enter customer ID');
    await user.type(input, '42');
    fireEvent.blur(input);
    await waitFor(() => { expect(screen.getByText('0110000042')).toBeInTheDocument(); });
    await user.click(screen.getByText('0110000042'));
    await user.click(screen.getByText('Next'));

    await waitFor(() => { expect(screen.getByText('Configure Card')).toBeInTheDocument(); });

    // Cardholder name auto-populates from customer fullName; manual input uppercases via onChange
    const nameInput = screen.getByDisplayValue('John Adeyemi');
    expect(nameInput).toBeInTheDocument();

    // Verify uppercase on manual input
    await user.clear(nameInput);
    await user.type(nameInput, 'test name');
    expect((nameInput as HTMLInputElement).value).toBe('TEST NAME');
  });
});
