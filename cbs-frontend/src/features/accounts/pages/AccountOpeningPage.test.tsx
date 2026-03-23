import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AccountOpeningPage } from './AccountOpeningPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockCustomerSearchResults = [
  {
    id: 101,
    fullName: 'Amara Okonkwo',
    type: 'INDIVIDUAL',
    email: 'amara@example.com',
    phone: '+2348012345678',
  },
];

const mockCustomerDetail = {
  id: 101,
  customerType: 'INDIVIDUAL',
  fullName: 'Amara Okonkwo',
  email: 'amara@example.com',
  phonePrimary: '+2348012345678',
  status: 'ACTIVE',
  metadata: { segment: 'Premier' },
  identifications: [
    { idType: 'BVN', idNumber: '12345678901', isVerified: true },
  ],
};

const mockProducts = [
  {
    id: 1,
    code: 'SAV-STD',
    name: 'Standard Savings',
    productCategory: 'SAVINGS',
    currencyCode: 'NGN',
    minOpeningBalance: 1000,
    monthlyMaintenanceFee: 0,
    baseInterestRate: 3.75,
    allowsDebitCard: true,
    allowsMobile: true,
    allowsInternet: true,
    isActive: true,
  },
  {
    id: 2,
    code: 'CUR-PRE',
    name: 'Premium Current',
    productCategory: 'CURRENT',
    currencyCode: 'NGN',
    minOpeningBalance: 5000,
    monthlyMaintenanceFee: 500,
    baseInterestRate: 0,
    allowsDebitCard: true,
    allowsMobile: true,
    allowsInternet: true,
    isActive: true,
  },
];

const mockCompliancePass = {
  kycVerified: true,
  kycLevel: 'FULL',
  amlClear: true,
  duplicateFound: false,
  dormantAccountExists: false,
};

const mockCreatedAccount = {
  id: 501,
  accountNumber: '0123456789',
  accountName: 'Amara Okonkwo',
  productName: 'Standard Savings',
  status: 'ACTIVE',
  currency: 'NGN',
};

function setupAllHandlers() {
  server.use(
    http.get('/api/v1/customers/quick-search', () =>
      HttpResponse.json(wrap(mockCustomerSearchResults)),
    ),
    http.get('/api/v1/customers/101', () =>
      HttpResponse.json(wrap(mockCustomerDetail)),
    ),
    http.get('/api/v1/accounts/products', () =>
      HttpResponse.json(wrap(mockProducts)),
    ),
    http.post('/api/v1/accounts/compliance-check', () =>
      HttpResponse.json(wrap(mockCompliancePass)),
    ),
    http.post('/api/v1/accounts', () =>
      HttpResponse.json(wrap(mockCreatedAccount), { status: 201 }),
    ),
  );
}

describe('AccountOpeningPage', () => {
  beforeEach(() => {
    localStorage.removeItem('cbs:account-opening-draft');
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('maps the live account opening contract end to end', async () => {
    let complianceBody: Record<string, unknown> | null = null;
    let createBody: Record<string, unknown> | null = null;

    server.use(
      http.get('/api/v1/customers/quick-search', () =>
        HttpResponse.json(wrap(mockCustomerSearchResults)),
      ),
      http.get('/api/v1/customers/101', () =>
        HttpResponse.json(wrap(mockCustomerDetail)),
      ),
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(wrap(mockProducts)),
      ),
      http.post('/api/v1/accounts/compliance-check', async ({ request }) => {
        complianceBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(wrap(mockCompliancePass));
      }),
      http.post('/api/v1/accounts', async ({ request }) => {
        createBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(wrap(mockCreatedAccount), { status: 201 });
      }),
    );

    renderWithProviders(<AccountOpeningPage />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expect(screen.getByText('Account Configuration')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => {
      expect(complianceBody).toEqual({
        customerId: 101,
        productCode: 'SAV-STD',
      });
      expect(screen.getByText(/all compliance checks passed/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /proceed to review/i }));

    await waitFor(() => {
      expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      expect(screen.getAllByText('Premier').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /open account/i }));

    await waitFor(() => {
      expect(createBody).toEqual({
        customerId: 101,
        productCode: 'SAV-STD',
        accountType: 'INDIVIDUAL',
        accountName: 'Amara Primary Savings',
        currencyCode: 'NGN',
        initialDeposit: 0,
        signatories: [],
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/account opened successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view account/i })).toHaveAttribute('href', '/accounts/0123456789');
    });
  });

  it('auto-loads a verified customer from query params and advances to product selection', async () => {
    server.use(
      http.get('/api/v1/customers/101', () =>
        HttpResponse.json(wrap(mockCustomerDetail)),
      ),
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(wrap(mockProducts)),
      ),
    );

    renderWithProviders(<AccountOpeningPage />, { route: '/accounts/open?customerId=101' });

    await waitFor(() => {
      expect(screen.getByText('Select Product')).toBeInTheDocument();
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });
  });

  it('keeps a preselected customer with pending kyc on the customer step', async () => {
    server.use(
      http.get('/api/v1/customers/101', () =>
        HttpResponse.json(
          wrap({
            ...mockCustomerDetail,
            identifications: [],
          }),
        ),
      ),
    );

    renderWithProviders(<AccountOpeningPage />, { route: '/accounts/open?customerId=101' });

    await waitFor(() => {
      expect(screen.getByText('Select Customer')).toBeInTheDocument();
      expect(screen.getByText(/kyc must be verified before opening an account/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });

  it('renders the stepper on initial load at step 1', () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    expect(screen.getByText('Open New Account')).toBeInTheDocument();
    // Stepper labels exist (some may appear multiple times)
    expect(screen.getAllByText('Customer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Product').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configure').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Compliance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
  });

  it('shows customer search results when typing in the search field', async () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });
  });

  it('displays multiple products on step 2', async () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    // Step 1: select customer
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    // Step 2: both products should be visible
    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
      expect(screen.getByText('Premium Current')).toBeInTheDocument();
    });
  });

  it('shows account configuration step with account title input', async () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    // Navigate through steps 1 and 2
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });
    await waitFor(() => expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Standard Savings')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expect(screen.getByText('Account Configuration')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/john doe or abc limited/i)).toBeInTheDocument();
  });

  it('sends correct compliance check payload', async () => {
    let complianceBody: Record<string, unknown> | null = null;
    server.use(
      http.get('/api/v1/customers/quick-search', () =>
        HttpResponse.json(wrap(mockCustomerSearchResults)),
      ),
      http.get('/api/v1/customers/101', () =>
        HttpResponse.json(wrap(mockCustomerDetail)),
      ),
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(wrap(mockProducts)),
      ),
      http.post('/api/v1/accounts/compliance-check', async ({ request }) => {
        complianceBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(wrap(mockCompliancePass));
      }),
    );

    renderWithProviders(<AccountOpeningPage />);

    // Navigate through steps 1-3
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });
    await waitFor(() => expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Standard Savings')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Account Configuration')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => {
      expect(complianceBody).toEqual({
        customerId: 101,
        productCode: 'SAV-STD',
      });
    });
  });

  it('displays review step with customer segment info', async () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    // Navigate through all steps
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });
    await waitFor(() => expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Standard Savings')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Account Configuration')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => expect(screen.getByText(/all compliance checks passed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /proceed to review/i }));

    await waitFor(() => {
      expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      expect(screen.getAllByText('Premier').length).toBeGreaterThan(0);
    });
  });

  it('requires terms checkbox before submitting', async () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    // Navigate through all steps to review
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });
    await waitFor(() => expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Standard Savings')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Account Configuration')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => expect(screen.getByText(/all compliance checks passed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /proceed to review/i }));

    await waitFor(() => expect(screen.getByText('Review & Submit')).toBeInTheDocument());

    const submitButton = screen.getByRole('button', { name: /open account/i });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(submitButton).not.toBeDisabled();
  });

  it('shows success state with account link after creation', async () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    // Full wizard flow
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });
    await waitFor(() => expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Standard Savings')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Account Configuration')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => expect(screen.getByText(/all compliance checks passed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /proceed to review/i }));

    await waitFor(() => expect(screen.getByText('Review & Submit')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /open account/i }));

    await waitFor(() => {
      expect(screen.getByText(/account opened successfully/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /view account/i })).toHaveAttribute('href', '/accounts/0123456789');
  });

  it('handles account creation server error', async () => {
    server.use(
      http.get('/api/v1/customers/quick-search', () =>
        HttpResponse.json(wrap(mockCustomerSearchResults)),
      ),
      http.get('/api/v1/customers/101', () =>
        HttpResponse.json(wrap(mockCustomerDetail)),
      ),
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(wrap(mockProducts)),
      ),
      http.post('/api/v1/accounts/compliance-check', () =>
        HttpResponse.json(wrap(mockCompliancePass)),
      ),
      http.post('/api/v1/accounts', () =>
        HttpResponse.json({ success: false, message: 'Failed' }, { status: 500 }),
      ),
    );

    renderWithProviders(<AccountOpeningPage />);

    // Navigate through all steps
    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });
    await waitFor(() => expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Standard Savings')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(screen.getByText('Account Configuration')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => expect(screen.getByText(/all compliance checks passed/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /proceed to review/i }));

    await waitFor(() => expect(screen.getByText('Review & Submit')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /open account/i }));

    // Should NOT show success
    await waitFor(() => {
      expect(screen.queryByText(/account opened successfully/i)).not.toBeInTheDocument();
    });
  });

  it('shows empty customer search results gracefully', async () => {
    server.use(
      http.get('/api/v1/customers/quick-search', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(<AccountOpeningPage />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'NonExistentCustomer' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Amara Okonkwo')).not.toBeInTheDocument();
    });
  });

  it('shows the search input placeholder on step 1', () => {
    setupAllHandlers();
    renderWithProviders(<AccountOpeningPage />);

    expect(screen.getByPlaceholderText(/search by name, cif, email, or phone/i)).toBeInTheDocument();
    expect(screen.getByText('Select Customer')).toBeInTheDocument();
  });
});
