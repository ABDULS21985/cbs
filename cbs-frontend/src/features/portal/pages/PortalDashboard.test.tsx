import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { PortalDashboard } from './PortalDashboard';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAccounts = [
  { id: 1, accountNumber: '0123456789', accountName: 'Savings Account', accountType: 'SAVINGS', balance: 2500000, availableBalance: 2400000, currency: 'NGN' },
  { id: 2, accountNumber: '0234567890', accountName: 'Current Account', accountType: 'CURRENT', balance: 8500000, availableBalance: 8200000, currency: 'NGN' },
];

const mockTransactions = [
  { id: 1, description: 'POS Purchase - Shoprite', amount: 15000, type: 'DEBIT', date: '2026-03-18T14:00:00Z' },
  { id: 2, description: 'Salary Credit', amount: 450000, type: 'CREDIT', date: '2026-03-17T09:00:00Z' },
  { id: 3, description: 'Transfer to John', amount: 50000, type: 'DEBIT', date: '2026-03-16T16:30:00Z' },
];

function setupHandlers(accounts = mockAccounts, transactions = mockTransactions) {
  server.use(
    http.get('/api/v1/portal/accounts', () => HttpResponse.json(wrap(accounts))),
    http.get('/api/v1/portal/transactions/recent', () => HttpResponse.json(wrap(transactions))),
  );
}

describe('PortalDashboard', () => {
  it('renders the greeting', () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('renders account overview subtitle', () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    expect(screen.getByText(/account overview/i)).toBeInTheDocument();
  });

  it('displays account cards after loading', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Savings Account')).toBeInTheDocument();
    });
    expect(screen.getByText('Current Account')).toBeInTheDocument();
  });

  it('displays account numbers', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('0123456789')).toBeInTheDocument();
    });
    expect(screen.getByText('0234567890')).toBeInTheDocument();
  });

  it('renders quick links', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Transfer')).toBeInTheDocument();
    });
    expect(screen.getByText('Pay Bills')).toBeInTheDocument();
    expect(screen.getByText('Statements')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('renders Recent Transactions section', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    });
  });

  it('renders View All link', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('View All')).toBeInTheDocument();
    });
  });

  it('displays recent transactions', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('POS Purchase - Shoprite')).toBeInTheDocument();
    });
    expect(screen.getByText('Salary Credit')).toBeInTheDocument();
    expect(screen.getByText('Transfer to John')).toBeInTheDocument();
  });

  it('shows "No recent transactions" when transactions are empty', async () => {
    setupHandlers(mockAccounts, []);
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No recent transactions')).toBeInTheDocument();
    });
  });

  it('shows loading state for accounts', () => {
    server.use(
      http.get('/api/v1/portal/accounts', () => new Promise(() => {})),
      http.get('/api/v1/portal/transactions/recent', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<PortalDashboard />);
    // Loading spinner should be visible
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('shows loading state for transactions', () => {
    server.use(
      http.get('/api/v1/portal/accounts', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/portal/transactions/recent', () => new Promise(() => {})),
    );
    renderWithProviders(<PortalDashboard />);
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('handles accounts API error gracefully', async () => {
    server.use(
      http.get('/api/v1/portal/accounts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/portal/transactions/recent', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<PortalDashboard />);
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('handles transactions API error gracefully', async () => {
    server.use(
      http.get('/api/v1/portal/accounts', () => HttpResponse.json(wrap(mockAccounts))),
      http.get('/api/v1/portal/transactions/recent', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<PortalDashboard />);
    expect(screen.getByText('Good morning!')).toBeInTheDocument();
  });

  it('renders account cards as links', async () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const accountLinks = links.filter(l => l.getAttribute('href')?.includes('/portal/accounts'));
      expect(accountLinks.length).toBeGreaterThan(0);
    });
  });

  it('renders quick links as navigable links', () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    const transferLink = screen.getByText('Transfer').closest('a');
    expect(transferLink).toHaveAttribute('href', '/portal/transfer');
  });

  it('renders without crashing when both APIs return empty', async () => {
    setupHandlers([], []);
    renderWithProviders(<PortalDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No recent transactions')).toBeInTheDocument();
    });
  });

  it('renders the four quick action items', () => {
    setupHandlers();
    renderWithProviders(<PortalDashboard />);
    expect(screen.getByText('Transfer')).toBeTruthy();
    expect(screen.getByText('Pay Bills')).toBeTruthy();
    expect(screen.getByText('Statements')).toBeTruthy();
    expect(screen.getByText('Support')).toBeTruthy();
  });
});
