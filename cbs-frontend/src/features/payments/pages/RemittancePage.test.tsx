import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { RemittancePage } from './RemittancePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCorridors = [
  {
    id: 1,
    corridorCode: 'NG-GH',
    sourceCountry: 'Nigeria',
    destinationCountry: 'Ghana',
    sourceCurrency: 'NGN',
    destinationCurrency: 'GHS',
    flatFee: 500,
    percentageFee: 1.5,
    feeCap: 5000,
    fxMarkupPct: 0.25,
    minAmount: 1000,
    maxAmount: 5000000,
    dailyLimit: 10000000,
    monthlyLimit: 50000000,
    settlementDays: 2,
    imtoPartnerCode: 'PARTNER1',
    imtoPartnerName: 'Corridor Partner A',
    isActive: true,
    requiresPurposeCode: true,
    requiresSourceOfFunds: true,
    blockedPurposeCodes: [],
  },
  {
    id: 2,
    corridorCode: 'NG-KE',
    sourceCountry: 'Nigeria',
    destinationCountry: 'Kenya',
    sourceCurrency: 'NGN',
    destinationCurrency: 'KES',
    flatFee: 750,
    percentageFee: 2.0,
    feeCap: 8000,
    fxMarkupPct: 0.5,
    minAmount: 2000,
    maxAmount: 3000000,
    dailyLimit: 8000000,
    monthlyLimit: 30000000,
    settlementDays: 3,
    imtoPartnerCode: 'PARTNER2',
    imtoPartnerName: 'Corridor Partner B',
    isActive: false,
    requiresPurposeCode: true,
    requiresSourceOfFunds: false,
    blockedPurposeCodes: [],
  },
];

const mockBeneficiaries = [
  {
    id: 1,
    customerId: 100,
    beneficiaryName: 'Kwame Asante',
    beneficiaryCountry: 'Ghana',
    beneficiaryCity: 'Accra',
    bankName: 'GCB Bank',
    bankSwiftCode: 'GCBLGHAC',
    accountNumber: '1234567890',
    relationship: 'Family',
    isVerified: true,
    isActive: true,
  },
  {
    id: 2,
    customerId: 100,
    beneficiaryName: 'Wanjiru Mwangi',
    beneficiaryCountry: 'Kenya',
    beneficiaryCity: 'Nairobi',
    bankName: 'Equity Bank',
    bankSwiftCode: 'EABOROBB',
    accountNumber: '0987654321',
    relationship: 'Business',
    isVerified: false,
    isActive: true,
  },
];

const mockTransactions = [
  {
    id: 1,
    remittanceRef: 'RMT-000001',
    customerId: 100,
    sourceAmount: 50000,
    sourceCurrency: 'NGN',
    destinationAmount: 620,
    destinationCurrency: 'GHS',
    fxRate: 0.0124,
    totalFee: 1250,
    purposeCode: 'FAMILY_SUPPORT',
    paymentRailCode: 'SWIFT',
    status: 'COMPLETED',
    createdAt: '2026-03-15T10:30:00Z',
  },
];

function setupHandlers(
  corridors = mockCorridors,
  beneficiaries = mockBeneficiaries,
) {
  server.use(
    http.get('/api/v1/remittances/corridors', () =>
      HttpResponse.json(wrap(corridors)),
    ),
    http.get('/api/v1/remittances/beneficiaries', () =>
      HttpResponse.json(wrap(beneficiaries)),
    ),
    http.get('/api/v1/remittances/customer/:customerId', () =>
      HttpResponse.json(wrap(mockTransactions)),
    ),
  );
}

/** Helper to find the tab button by label (not the stat card with the same name) */
function getTabButton(label: string) {
  const buttons = screen.getAllByText(label);
  const tabBtn = buttons.find((el) => el.tagName === 'BUTTON' && el.className.includes('border-b-2'));
  return tabBtn ?? buttons[0];
}

describe('RemittancePage', () => {
  // -- Page header --
  it('renders the page title', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    expect(screen.getByText('Remittances')).toBeInTheDocument();
  });

  it('renders the page subtitle', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    expect(
      screen.getByText(
        'Cross-border remittance corridors, transactions, and beneficiaries',
      ),
    ).toBeInTheDocument();
  });

  // -- Tabs --
  it('renders all three tabs', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    // "Corridors", "Transactions", "Beneficiaries" may appear both as tab buttons
    // and as stat card labels. Use getAllByText to verify they exist.
    expect(screen.getAllByText('Corridors').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Transactions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Beneficiaries').length).toBeGreaterThanOrEqual(1);
  });

  it('has Corridors tab active by default', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    const corridorsTab = getTabButton('Corridors');
    expect(corridorsTab.className).toContain('border-primary');
  });

  it('can switch to Transactions tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    const txnTab = getTabButton('Transactions');
    fireEvent.click(txnTab);
    expect(txnTab.className).toContain('border-primary');
  });

  it('can switch to Beneficiaries tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    const benTab = getTabButton('Beneficiaries');
    fireEvent.click(benTab);
    expect(benTab.className).toContain('border-primary');
  });

  // -- Action buttons --
  it('shows New Corridor button on Corridors tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    expect(screen.getByText('New Corridor')).toBeInTheDocument();
  });

  it('does not show Add Beneficiary button on Corridors tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    expect(screen.queryByText('Add Beneficiary')).not.toBeInTheDocument();
  });

  it('shows Add Beneficiary button on Beneficiaries tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    expect(screen.getByText('Add Beneficiary')).toBeInTheDocument();
  });

  it('does not show New Corridor button on Beneficiaries tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    expect(screen.queryByText('New Corridor')).not.toBeInTheDocument();
  });

  // -- Corridors data --
  it('loads and displays corridor data', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(screen.getByText('NG-GH')).toBeInTheDocument();
    });
    expect(screen.getByText('NG-KE')).toBeInTheDocument();
  });

  it('shows corridor source and destination countries', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(screen.getByText('Ghana')).toBeInTheDocument();
    });
    expect(screen.getByText('Kenya')).toBeInTheDocument();
  });

  it('shows corridor IMTO partner names', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(screen.getByText('Corridor Partner A')).toBeInTheDocument();
    });
    expect(screen.getByText('Corridor Partner B')).toBeInTheDocument();
  });

  it('shows corridor column headers', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(screen.getByText('Code')).toBeInTheDocument();
    });
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
    expect(screen.getByText('IMTO Partner')).toBeInTheDocument();
  });

  // -- Empty states --
  it('shows empty message when no corridors configured', async () => {
    setupHandlers([]);
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(screen.getByText('No corridors configured')).toBeInTheDocument();
    });
  });

  it('shows empty message when no beneficiaries registered', async () => {
    setupHandlers(mockCorridors, []);
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    await waitFor(() => {
      expect(
        screen.getByText('No beneficiaries registered'),
      ).toBeInTheDocument();
    });
  });

  it('shows prompt to enter customer ID on Transactions tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Transactions'));
    expect(
      screen.getByText('Enter a customer ID to view remittance history'),
    ).toBeInTheDocument();
  });

  // -- Beneficiaries data --
  it('loads and displays beneficiary data', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    await waitFor(() => {
      expect(screen.getByText('Kwame Asante')).toBeInTheDocument();
    });
    expect(screen.getByText('Wanjiru Mwangi')).toBeInTheDocument();
  });

  it('shows beneficiary bank names', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    await waitFor(() => {
      expect(screen.getByText('GCB Bank')).toBeInTheDocument();
    });
    expect(screen.getByText('Equity Bank')).toBeInTheDocument();
  });

  it('shows beneficiary column headers', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
  });

  // -- Create Corridor dialog --
  it('opens New Corridor dialog when button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(screen.getByText('New Corridor'));
    await waitFor(() => {
      expect(
        screen.getByText('New Remittance Corridor'),
      ).toBeInTheDocument();
    });
  });

  it('shows corridor form fields in dialog', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(screen.getByText('New Corridor'));
    await waitFor(() => {
      expect(screen.getByText('Corridor Code *')).toBeInTheDocument();
    });
    expect(screen.getByText('Source Country *')).toBeInTheDocument();
    expect(screen.getByText('Destination Country *')).toBeInTheDocument();
    expect(screen.getByText('Source Currency *')).toBeInTheDocument();
    expect(screen.getByText('Destination Currency *')).toBeInTheDocument();
  });

  it('shows Cancel and Create buttons in corridor dialog', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(screen.getByText('New Corridor'));
    await waitFor(() => {
      expect(screen.getByText('Create')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  // -- Create Beneficiary dialog --
  it('opens Add Beneficiary dialog when button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    fireEvent.click(screen.getByText('Add Beneficiary'));
    await waitFor(() => {
      expect(
        screen.getByText('Add Remittance Beneficiary'),
      ).toBeInTheDocument();
    });
  });

  it('shows beneficiary form fields in dialog', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Beneficiaries'));
    fireEvent.click(screen.getByText('Add Beneficiary'));
    await waitFor(() => {
      expect(screen.getByText('Beneficiary Name *')).toBeInTheDocument();
    });
    expect(screen.getByText('Country *')).toBeInTheDocument();
    expect(screen.getByText('Bank Name *')).toBeInTheDocument();
    expect(screen.getByText('Account Number *')).toBeInTheDocument();
  });

  // -- Stat cards --
  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    // Stat cards show skeletons while loading; wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Active Corridors')).toBeInTheDocument();
    });
    // "Corridors" appears as stat card label and tab
    expect(screen.getAllByText('Corridors').length).toBeGreaterThanOrEqual(2);
    // "Beneficiaries" also appears as stat card label and tab
    expect(screen.getAllByText('Beneficiaries').length).toBeGreaterThanOrEqual(2);
  });

  // -- Error state --
  it('shows error banner when corridors fail to load', async () => {
    server.use(
      http.get('/api/v1/remittances/corridors', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/remittances/beneficiaries', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(
        screen.getByText('Failed to load remittance data.'),
      ).toBeInTheDocument();
    });
  });

  it('shows Retry button when corridors fail to load', async () => {
    server.use(
      http.get('/api/v1/remittances/corridors', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/remittances/beneficiaries', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    renderWithProviders(<RemittancePage />);
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  // -- Transactions tab with customer ID --
  it('shows Customer ID input on Transactions tab', () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Transactions'));
    // "Customer ID" appears as both label and stat card label — check for the input
    expect(
      screen.getByPlaceholderText('Enter customer ID'),
    ).toBeInTheDocument();
  });

  it('loads transactions when a valid customer ID is entered', async () => {
    setupHandlers();
    renderWithProviders(<RemittancePage />);
    fireEvent.click(getTabButton('Transactions'));
    const input = screen.getByPlaceholderText('Enter customer ID');
    fireEvent.change(input, { target: { value: '100' } });
    await waitFor(() => {
      expect(screen.getByText('RMT-000001')).toBeInTheDocument();
    });
  });

  // -- Server errors --
  it('handles server error for beneficiaries gracefully', () => {
    server.use(
      http.get('/api/v1/remittances/corridors', () =>
        HttpResponse.json(wrap(mockCorridors)),
      ),
      http.get('/api/v1/remittances/beneficiaries', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderWithProviders(<RemittancePage />);
    expect(screen.getByText('Remittances')).toBeInTheDocument();
  });
});
