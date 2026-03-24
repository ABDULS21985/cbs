import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';

import { PortalDashboard } from './PortalDashboard';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const portalUser = createMockUser({
  id: '61',
  fullName: 'Ada Lovelace',
});

const mockDashboard = {
  customerId: 61,
  cifNumber: 'CIF00000061',
  displayName: 'Ada Lovelace',
  totalAccounts: 2,
  totalBookBalance: 10_900_000,
  totalAvailableBalance: 10_600_000,
  accounts: [
    {
      id: 1,
      accountNumber: '0123456789',
      accountName: 'Savings Account',
      accountType: 'SAVINGS',
      availableBalance: 2_400_000,
      bookBalance: 2_500_000,
      currency: 'NGN',
      status: 'ACTIVE',
      lastTransactionDescription: 'Salary Credit',
      lastTransactionDate: '2026-03-23T08:00:00Z',
      sparkline: [2100000, 2200000, 2300000, 2400000],
    },
    {
      id: 2,
      accountNumber: '0234567890',
      accountName: 'Current Account',
      accountType: 'CURRENT',
      availableBalance: 8_200_000,
      bookBalance: 8_400_000,
      currency: 'NGN',
      status: 'ACTIVE',
      lastTransactionDescription: 'Vendor settlement',
      lastTransactionDate: '2026-03-22T13:00:00Z',
      sparkline: [7800000, 8000000, 8100000, 8200000],
    },
  ],
  financialHealth: {
    score: 82,
    riskLevel: 'GOOD',
    savingsRate: 34,
    factors: {},
    insights: {
      summary: 'Healthy cash position',
    },
  },
  spendingBreakdown: {
    totalThisMonth: 180000,
    totalLastMonth: 150000,
    changePercent: 20,
    categories: [
      { category: 'Bills', amountThisMonth: 70000, amountLastMonth: 60000, budgetAmount: 80000, color: '#2563eb' },
      { category: 'Transfers', amountThisMonth: 110000, amountLastMonth: 90000, budgetAmount: 120000, color: '#16a34a' },
    ],
    smartInsights: ['Transfers are up this month'],
  },
  goals: [],
  upcoming: [],
  recentActivity: [
    {
      id: 1,
      transactionRef: 'TRX001',
      accountNumber: '0123456789',
      transactionType: 'DEBIT',
      amount: 15000,
      currencyCode: 'NGN',
      narration: 'POS Purchase - Shoprite',
      status: 'SUCCESS',
      createdAt: '2026-03-23T08:30:00Z',
    },
    {
      id: 2,
      transactionRef: 'TRX002',
      accountNumber: '0123456789',
      transactionType: 'CREDIT',
      amount: 450000,
      currencyCode: 'NGN',
      narration: 'Salary Credit',
      status: 'SUCCESS',
      createdAt: '2026-03-22T09:00:00Z',
    },
    {
      id: 3,
      transactionRef: 'TRX003',
      accountNumber: '0234567890',
      transactionType: 'DEBIT',
      amount: 50000,
      currencyCode: 'NGN',
      narration: 'Transfer to John',
      status: 'SUCCESS',
      createdAt: '2026-03-21T16:30:00Z',
    },
  ],
};

function setupHandlers(dashboard = mockDashboard) {
  server.use(
    http.get('/api/v1/portal/dashboard/enhanced/:customerId', ({ params }) => {
      if (params.customerId !== '61') {
        return HttpResponse.json({}, { status: 404 });
      }
      return HttpResponse.json(wrap(dashboard));
    }),
  );
}

describe('PortalDashboard', () => {
  it('renders the greeting and overview copy', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText(/Good (morning|afternoon|evening), Ada/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/financial overview/i)).toBeInTheDocument();
  });

  it('displays account cards and account numbers', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText('Savings Account')).toBeInTheDocument();
    });

    expect(screen.getByText('Current Account')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(screen.getByText('0234567890')).toBeInTheDocument();
  });

  it('renders quick links with current labels', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });

    expect(screen.getByText('Pay Bills')).toBeInTheDocument();
    expect(screen.getByText('Buy Airtime')).toBeInTheDocument();
    expect(screen.getByText('Statement')).toBeInTheDocument();
  });

  it('renders recent activity and the view-all link', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(screen.getByText(/view all/i)).toBeInTheDocument();
    expect(screen.getByText('POS Purchase - Shoprite')).toBeInTheDocument();
    expect(screen.getAllByText('Salary Credit').length).toBeGreaterThan(0);
    expect(screen.getByText('Transfer to John')).toBeInTheDocument();
  });

  it('shows the empty recent activity state', async () => {
    setupHandlers({ ...mockDashboard, recentActivity: [] });
    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText('No recent transactions')).toBeInTheDocument();
    });
  });

  it('shows a loading spinner while the dashboard is pending', () => {
    server.use(
      http.get('/api/v1/portal/dashboard/enhanced/:customerId', () => new Promise(() => {})),
    );

    renderWithProviders(<PortalDashboard />, { user: portalUser });

    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('shows the dashboard error state when the backend fails', async () => {
    server.use(
      http.get('/api/v1/portal/dashboard/enhanced/:customerId', () => HttpResponse.json({}, { status: 500 })),
    );

    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument();
    });
  });

  it('renders account cards and quick links as navigable links', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />, { user: portalUser });

    await waitFor(() => {
      expect(screen.getByText('Savings Account')).toBeInTheDocument();
    });

    const accountLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/portal/accounts');
    expect(accountLinks.length).toBeGreaterThan(0);

    expect(screen.getByText('Transfer').closest('a')).toHaveAttribute('href', '/portal/transfer');
    expect(screen.getByText('Pay Bills').closest('a')).toHaveAttribute('href', '/portal/bills');
    expect(screen.getByText('Buy Airtime').closest('a')).toHaveAttribute('href', '/portal/airtime');
    expect(screen.getByText('Statement').closest('a')).toHaveAttribute('href', '/portal/accounts');
  });
});
