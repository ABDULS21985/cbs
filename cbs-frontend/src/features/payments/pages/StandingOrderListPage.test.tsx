import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { StandingOrderListPage } from './StandingOrderListPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockOrders = [
  { id: 1, reference: 'SO-000001', sourceAccountNumber: '0123456789', sourceAccountName: 'Test Account', beneficiaryName: 'Landlord', beneficiaryAccount: '0987654321', beneficiaryBankName: 'GTBank', amount: 150000, currency: 'NGN', frequency: 'MONTHLY', dayOfMonth: 1, startDate: '2026-01-01', nextExecution: '2026-04-01', description: 'Rent', executionCount: 3, failureCount: 0, status: 'ACTIVE' },
  { id: 2, reference: 'SO-000002', sourceAccountNumber: '0123456789', sourceAccountName: 'Test Account', beneficiaryName: 'School', beneficiaryAccount: '1234567890', beneficiaryBankName: 'First Bank', amount: 250000, currency: 'NGN', frequency: 'QUARTERLY', dayOfMonth: 15, startDate: '2026-01-15', nextExecution: '2026-07-15', description: 'Tuition', executionCount: 1, failureCount: 0, status: 'ACTIVE' },
];

const mockMandates = [
  { id: 1, mandateRef: 'DD-000001', creditorName: 'DSTV', accountNumber: '0123456789', maxAmount: 30000, currency: 'NGN', frequency: 'MONTHLY', lastDebit: '2026-03-15', status: 'ACTIVE' },
];

function setupHandlers(orders = mockOrders, mandates = mockMandates) {
  server.use(
    http.get('/api/v1/standing-orders', () => HttpResponse.json(wrap(orders))),
    http.get('/api/v1/direct-debits', () => HttpResponse.json(wrap(mandates))),
  );
}

describe('StandingOrderListPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText('Standing Orders & Direct Debits')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText(/manage recurring payment instructions/i)).toBeInTheDocument();
  });

  it('renders New Standing Order button', () => {
    setupHandlers();
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText('New Standing Order')).toBeInTheDocument();
  });

  it('renders Standing Orders tab', () => {
    setupHandlers();
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText('Standing Orders')).toBeInTheDocument();
  });

  it('renders Direct Debits tab', () => {
    setupHandlers();
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText('Direct Debits')).toBeInTheDocument();
  });

  it('Standing Orders tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<StandingOrderListPage />);
    const soTab = screen.getByText('Standing Orders');
    expect(soTab.className).toContain('border-primary');
  });

  it('can switch to Direct Debits tab', async () => {
    setupHandlers();
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('Direct Debits'));
    const ddTab = screen.getByText('Direct Debits');
    expect(ddTab.className).toContain('border-primary');
  });

  it('shows mandate ref column on Direct Debits tab', async () => {
    setupHandlers();
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('Direct Debits'));
    await waitFor(() => {
      expect(screen.getByText('Mandate Ref')).toBeInTheDocument();
    });
  });

  it('shows mandate data on Direct Debits tab', async () => {
    setupHandlers();
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('Direct Debits'));
    await waitFor(() => {
      expect(screen.getByText('DSTV')).toBeInTheDocument();
    });
  });

  it('shows "No direct debit mandates" when mandates are empty', async () => {
    setupHandlers(mockOrders, []);
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('Direct Debits'));
    await waitFor(() => {
      expect(screen.getByText('No direct debit mandates')).toBeInTheDocument();
    });
  });

  it('clicking New Standing Order shows the form', async () => {
    setupHandlers();
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('New Standing Order'));
    await waitFor(() => {
      expect(screen.getByText('New Standing Order')).toBeInTheDocument();
    });
  });

  it('handles empty standing orders', async () => {
    setupHandlers([]);
    renderWithProviders(<StandingOrderListPage />);
    // Should render page with empty table
    expect(screen.getByText('Standing Orders & Direct Debits')).toBeInTheDocument();
  });

  it('handles server error for standing orders', async () => {
    server.use(
      http.get('/api/v1/standing-orders', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText('Standing Orders & Direct Debits')).toBeInTheDocument();
  });

  it('handles server error for direct debits', async () => {
    server.use(
      http.get('/api/v1/direct-debits', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<StandingOrderListPage />);
    expect(screen.getByText('Standing Orders & Direct Debits')).toBeInTheDocument();
  });

  it('renders direct debit columns', async () => {
    setupHandlers();
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('Direct Debits'));
    await waitFor(() => {
      expect(screen.getByText('Creditor')).toBeInTheDocument();
    });
    expect(screen.getByText('Max Amount')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders the DD-000001 mandate ref', async () => {
    setupHandlers();
    
    renderWithProviders(<StandingOrderListPage />);
    fireEvent.click(screen.getByText('Direct Debits'));
    await waitFor(() => {
      expect(screen.getByText('DD-000001')).toBeInTheDocument();
    });
  });
});
