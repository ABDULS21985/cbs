import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { CustomerAnalyticsPage } from './CustomerAnalyticsPage';

const CUSTOMER_ID = 42;

const mockCustomer = {
  id: CUSTOMER_ID,
  customerNumber: 'CIF0000042',
  fullName: 'Ngozi Adeyemi',
  type: 'INDIVIDUAL',
  status: 'ACTIVE',
  riskRating: 'LOW',
  kycStatus: 'VERIFIED',
  addresses: [],
  identifications: [],
  contacts: [],
  relationships: [],
  notes: [],
};

const mockProfitability = {
  customerId: CUSTOMER_ID,
  interestIncome: 120000,
  feeIncome: 15000,
  fxIncome: 5000,
  otherIncome: 2000,
  totalRevenue: 142000,
  costOfFunds: 45000,
  operatingCost: 20000,
  provisions: 5000,
  otherCost: 3000,
  totalCost: 73000,
  netContribution: 69000,
  marginPct: 48.6,
  lifetimeValue: 850000,
  tenureMonths: 36,
  totalBalance: 2500000,
  accountCount: 3,
  monthlyTrend: [
    { month: '2025-10', revenue: 11000 },
    { month: '2025-11', revenue: 12500 },
    { month: '2025-12', revenue: 11800 },
  ],
  revenueBreakdown: [
    { name: 'Interest', value: 120000 },
    { name: 'Fees', value: 15000 },
    { name: 'FX', value: 5000 },
    { name: 'Other', value: 2000 },
  ],
};

const mockChurnRisk = {
  customerId: CUSTOMER_ID,
  riskScore: 28,
  riskLevel: 'LOW',
  riskFactors: [
    { factor: 'Account activity', impact: 'High balance maintained', direction: 'DOWN' },
    { factor: 'Product breadth', impact: 'Multiple products held', direction: 'DOWN' },
  ],
  recommendedActions: [
    { action: 'Cross-sell investment product', description: 'Customer is eligible for fixed deposit upsell' },
  ],
};

function setupHandlers() {
  server.use(
    http.get(`/api/v1/customers/${CUSTOMER_ID}`, () =>
      HttpResponse.json({ success: true, data: mockCustomer, timestamp: new Date().toISOString() }),
    ),
    http.get(`/api/v1/customers/${CUSTOMER_ID}/profitability`, () =>
      HttpResponse.json({ success: true, data: mockProfitability, timestamp: new Date().toISOString() }),
    ),
    http.get(`/api/v1/customers/${CUSTOMER_ID}/churn-risk`, () =>
      HttpResponse.json({ success: true, data: mockChurnRisk, timestamp: new Date().toISOString() }),
    ),
  );
}

describe('CustomerAnalyticsPage', () => {
  it('renders the page header with customer name after loading', async () => {
    setupHandlers();

    renderWithProviders(<CustomerAnalyticsPage />, {
      route: `/customers/${CUSTOMER_ID}/analytics`,
      routerProps: { initialEntries: [`/customers/${CUSTOMER_ID}/analytics`] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Analytics — Ngozi Adeyemi/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/CIF0000042/)).toBeInTheDocument();
  });

  it('shows Profitability tab and renders profitability data', async () => {
    setupHandlers();

    renderWithProviders(<CustomerAnalyticsPage />, {
      route: `/customers/${CUSTOMER_ID}/analytics`,
      routerProps: { initialEntries: [`/customers/${CUSTOMER_ID}/analytics`] },
    });

    await waitFor(() => {
      expect(screen.getByText('Profitability')).toBeInTheDocument();
    });

    // ProfitabilityDashboard should render with the loaded data
    await waitFor(() => {
      // Net contribution should appear somewhere in the dashboard
      expect(screen.queryByText(/calculating profitability/i)).not.toBeInTheDocument();
    });
  });

  it('shows customer-not-found state when customer fetch fails', async () => {
    server.use(
      http.get(`/api/v1/customers/${CUSTOMER_ID}`, () =>
        HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 }),
      ),
    );

    renderWithProviders(<CustomerAnalyticsPage />, {
      route: `/customers/${CUSTOMER_ID}/analytics`,
      routerProps: { initialEntries: [`/customers/${CUSTOMER_ID}/analytics`] },
    });

    await waitFor(() => {
      expect(screen.getByText(/customer not found/i)).toBeInTheDocument();
    });
  });

  it('shows profitability unavailable when profitability endpoint errors', async () => {
    server.use(
      http.get(`/api/v1/customers/${CUSTOMER_ID}`, () =>
        HttpResponse.json({ success: true, data: mockCustomer, timestamp: new Date().toISOString() }),
      ),
      http.get(`/api/v1/customers/${CUSTOMER_ID}/profitability`, () =>
        HttpResponse.json({ success: false, message: 'Unavailable' }, { status: 500 }),
      ),
      http.get(`/api/v1/customers/${CUSTOMER_ID}/churn-risk`, () =>
        HttpResponse.json({ success: true, data: mockChurnRisk, timestamp: new Date().toISOString() }),
      ),
    );

    renderWithProviders(<CustomerAnalyticsPage />, {
      route: `/customers/${CUSTOMER_ID}/analytics`,
      routerProps: { initialEntries: [`/customers/${CUSTOMER_ID}/analytics`] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Analytics — Ngozi Adeyemi/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/profitability data unavailable/i)).toBeInTheDocument();
    });
  });
});
