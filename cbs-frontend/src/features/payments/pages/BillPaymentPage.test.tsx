import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { BillPaymentPage } from './BillPaymentPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCategories = [
  { code: 'electricity', name: 'Electricity', icon: 'zap', billerCount: 5 },
  { code: 'cable_tv', name: 'Cable TV', icon: 'tv', billerCount: 3 },
  { code: 'airtime', name: 'Airtime', icon: 'phone', billerCount: 4 },
];

const mockBillers = [
  {
    id: 1,
    name: 'IKEDC',
    code: 'IKEDC-01',
    categoryCode: 'electricity',
    fields: [{ name: 'customerId', label: 'Meter Number', type: 'TEXT', required: true }],
    isFixedAmount: false,
    commission: 100,
    commissionType: 'FLAT',
    status: 'ACTIVE',
  },
  {
    id: 2,
    name: 'EKEDC',
    code: 'EKEDC-01',
    categoryCode: 'electricity',
    fields: [{ name: 'customerId', label: 'Meter Number', type: 'TEXT', required: true }],
    isFixedAmount: false,
    commission: 100,
    commissionType: 'FLAT',
    status: 'ACTIVE',
  },
];

const mockFavorites = [
  {
    id: 1,
    alias: 'My Electricity',
    billerName: 'IKEDC',
    billerCode: 'IKEDC-01',
    categoryCode: 'electricity',
    fields: { customerId: '0123456789' },
    lastPaidAmount: 15000,
    lastPaidAt: '2026-03-23T08:00:00Z',
  },
];

const mockHistory = [
  {
    id: 99,
    transactionRef: 'BILL-123',
    billerName: 'IKEDC',
    billerCode: 'IKEDC-01',
    categoryCode: 'electricity',
    amount: 15000,
    fee: 100,
    totalDebit: 15100,
    status: 'SUCCESSFUL',
    customerReference: '0123456789',
    paidAt: '2026-03-23T08:00:00Z',
  },
];

function setupHandlers({
  categories = mockCategories,
  billers = mockBillers,
  favorites = mockFavorites,
  history = mockHistory,
}: {
  categories?: typeof mockCategories;
  billers?: typeof mockBillers;
  favorites?: typeof mockFavorites;
  history?: typeof mockHistory;
} = {}) {
  server.use(
    http.get('/api/v1/bills/categories', () => HttpResponse.json(wrap(categories))),
    http.get('/api/v1/bills/categories/:categoryCode/billers', () => HttpResponse.json(wrap(billers))),
    http.get('/api/v1/bills/favorites', () => HttpResponse.json(wrap(favorites))),
    http.get('/api/v1/bills/billers/search', () => HttpResponse.json(wrap(billers))),
    http.get('/api/v1/bills/history', () => HttpResponse.json(wrap(history))),
    http.get('/api/v1/accounts', () =>
      HttpResponse.json(wrap([
        {
          id: 1,
          accountNumber: '1000000001',
          accountName: 'Primary Savings',
          accountType: 'SAVINGS',
          currency: 'NGN',
          availableBalance: 500000,
        },
      ]))),
    http.get('/api/v1/bills/fee-preview', () =>
      HttpResponse.json(wrap({
        billerCode: 'IKEDC-01',
        amount: 15000,
        fee: 100,
        commission: 100,
        totalDebit: 15100,
      }))),
  );
}

describe('BillPaymentPage', () => {
  it('renders the redesigned bill payment workspace', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);

    expect(screen.getByText('Bill Payments')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Utility, subscription, and airtime settlement command center')).toBeInTheDocument();
    });
  });

  it('shows category cards and saved favorites', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });

    expect(screen.getByText('Cable TV')).toBeInTheDocument();
    expect(screen.getByText('Saved Favorites')).toBeInTheDocument();
    expect(screen.getByText('My Electricity')).toBeInTheDocument();
  });

  it('navigates from category selection into the payment form', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);

    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Electricity'));

    await waitFor(() => {
      expect(screen.getByText('Back to categories')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('IKEDC')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('IKEDC'));

    await waitFor(() => {
      expect(screen.getByText('Meter Number')).toBeInTheDocument();
    });
  });

  it('loads payment history when the history tab is opened', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);

    fireEvent.click(screen.getByRole('button', { name: /Payment History/i }));

    await waitFor(() => {
      expect(screen.getByText('BILL-123')).toBeInTheDocument();
    });

    expect(screen.getByText('Pay Again')).toBeInTheDocument();
  });
});
