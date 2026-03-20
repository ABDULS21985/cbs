import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { MobileMoneyPage } from './MobileMoneyPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockLinkedAccounts = [
  {
    id: '1',
    provider: 'MTN_MOMO',
    mobileNumber: '08031234567',
    linkedAccount: '0012345678',
    status: 'ACTIVE',
    lastTransaction: '2026-03-10T09:00:00Z',
  },
];

const mockTransactions = [
  {
    id: '1',
    date: new Date().toISOString(),
    direction: 'IN',
    provider: 'MTN_MOMO',
    mobileNumber: '08031234567',
    amount: 10000,
    fee: 25,
    status: 'COMPLETED',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/payments/mobile-money/linked', () =>
      HttpResponse.json(wrap(mockLinkedAccounts)),
    ),
    http.get('/api/v1/payments/mobile-money/transactions', () =>
      HttpResponse.json(wrap(mockTransactions)),
    ),
  );
}

describe('MobileMoneyPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<MobileMoneyPage />);
    expect(screen.getByText('Mobile Money')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<MobileMoneyPage />);
    expect(screen.getByText(/manage linked mobile money/i)).toBeInTheDocument();
  });

  it('renders linked accounts section', async () => {
    setupHandlers();
    renderWithProviders(<MobileMoneyPage />);
    await waitFor(() => {
      expect(screen.getByText('Linked Accounts')).toBeInTheDocument();
    });
  });

  it('renders transaction history section', () => {
    setupHandlers();
    renderWithProviders(<MobileMoneyPage />);
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    setupHandlers();
    renderWithProviders(<MobileMoneyPage />);
    expect(screen.getByText('Linked Accounts')).toBeInTheDocument();
    expect(screen.getByText("Today's Volume")).toBeInTheDocument();
    expect(screen.getByText("Today's Transactions")).toBeInTheDocument();
  });

  it('renders link account button', async () => {
    setupHandlers();
    renderWithProviders(<MobileMoneyPage />);
    await waitFor(() => {
      expect(screen.getByText('Link Account')).toBeInTheDocument();
    });
  });

  it('handles empty linked accounts', async () => {
    server.use(
      http.get('/api/v1/payments/mobile-money/linked', () =>
        HttpResponse.json(wrap([])),
      ),
      http.get('/api/v1/payments/mobile-money/transactions', () =>
        HttpResponse.json(wrap([])),
      ),
    );
    renderWithProviders(<MobileMoneyPage />);
    await waitFor(() => {
      expect(screen.getByText(/no linked mobile money/i)).toBeInTheDocument();
    });
  });
});
