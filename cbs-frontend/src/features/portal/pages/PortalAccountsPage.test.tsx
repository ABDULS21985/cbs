import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { PortalAccountsPage } from './PortalAccountsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const accounts = [
  {
    id: 1,
    accountNumber: '1000000001',
    accountName: 'Primary Savings',
    accountType: 'SAVINGS',
    balance: 450000,
    availableBalance: 420000,
    currency: 'NGN',
    status: 'ACTIVE',
  },
  {
    id: 2,
    accountNumber: '1000000002',
    accountName: 'Business Current',
    accountType: 'CURRENT',
    balance: 2100000,
    availableBalance: 2050000,
    currency: 'NGN',
    status: 'ACTIVE',
  },
];

const transactionsByAccount = {
  '1': [
    {
      id: 11,
      date: '2026-03-23T09:00:00Z',
      description: 'Salary Credit',
      type: 'CREDIT',
      amount: 200000,
      balance: 420000,
    },
  ],
  '2': [
    {
      id: 21,
      date: '2026-03-22T14:00:00Z',
      description: 'Vendor Settlement',
      type: 'DEBIT',
      amount: 150000,
      balance: 2050000,
    },
  ],
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/portal/accounts', () => HttpResponse.json(wrap(accounts))),
    http.get('/api/v1/portal/accounts/:accountId/transactions', ({ params }) =>
      HttpResponse.json(wrap(transactionsByAccount[String(params.accountId) as '1' | '2'] ?? []))),
  );
}

describe('PortalAccountsPage', () => {
  it('renders the upgraded overview with accounts and activity', async () => {
    setupHandlers();
    renderWithProviders(<PortalAccountsPage />);

    await screen.findByRole('button', { name: /Primary Savings/i });

    expect(screen.getByRole('button', { name: /Business Current/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Salary Credit')).toBeInTheDocument();
    });
    expect(screen.getByText('Available balance')).toBeInTheDocument();
  });

  it('loads the selected account activity when a different account is chosen', async () => {
    setupHandlers();
    const user = userEvent.setup();

    renderWithProviders(<PortalAccountsPage />);

    await screen.findByRole('button', { name: /Business Current/i });

    await user.click(screen.getByRole('button', { name: /Business Current/i }));

    await waitFor(() => {
      expect(screen.getByText('Vendor Settlement')).toBeInTheDocument();
    });
  });
});
