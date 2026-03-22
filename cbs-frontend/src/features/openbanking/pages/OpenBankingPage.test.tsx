import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { OpenBankingPage } from './OpenBankingPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockClients = [
  {
    id: 1, clientId: 'CLIENT_001', clientName: 'FinTech Payments',
    clientType: 'TPP_AISP', isActive: true, redirectUris: ['https://example.com/cb'],
    allowedScopes: ['accounts', 'balances'], dailyRequestCount: 150,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2, clientId: 'CLIENT_002', clientName: 'PayCo',
    clientType: 'TPP_PISP', isActive: false, redirectUris: ['https://payco.io/cb'],
    allowedScopes: ['payments'], dailyRequestCount: 0,
    createdAt: '2025-11-15T00:00:00Z', updatedAt: '2025-11-15T00:00:00Z',
  },
];

const mockConsents = [
  {
    id: 1, consentId: 'CST-0001', clientId: 'CLIENT_001', customerId: 1001,
    consentType: 'ACCOUNT_ACCESS', permissions: ['ReadAccountsBasic', 'ReadBalances'],
    accountIds: [1], status: 'AUTHORISED',
    grantedAt: '2026-01-15T10:00:00Z', expiresAt: '2026-07-15T10:00:00Z',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 2, consentId: 'CST-0002', clientId: 'CLIENT_001', customerId: 1002,
    consentType: 'PAYMENT_INITIATION', permissions: ['InitiatePayment'],
    accountIds: [], status: 'AWAITING_AUTHORISATION',
    expiresAt: '2026-04-01T10:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 3, consentId: 'CST-0003', clientId: 'CLIENT_002', customerId: 1003,
    consentType: 'ACCOUNT_ACCESS', permissions: ['ReadAccountsBasic'],
    accountIds: [], status: 'REVOKED', revokedAt: '2026-02-10T10:00:00Z',
    expiresAt: '2026-08-01T10:00:00Z',
    createdAt: '2025-12-01T10:00:00Z',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap(mockClients))),
    http.get('/api/v1/openbanking/consents', () => HttpResponse.json(wrap(mockConsents))),
  );
}

describe('OpenBankingPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    expect(screen.getByText('Open Banking & PSD2')).toBeInTheDocument();
  });

  it('renders the Register TPP button', () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    expect(screen.getByText('Register TPP')).toBeInTheDocument();
  });

  it('displays TPP clients in the table', async () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    await waitFor(() => {
      expect(screen.getByText('FinTech Payments')).toBeInTheDocument();
    });
  });

  it('renders consents dashboard tab', async () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    await waitFor(() => {
      expect(screen.getByText('Consents Dashboard')).toBeInTheDocument();
    });
  });

  it('shows PSD2 Compliant badge', () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    expect(screen.getByText('PSD2 Compliant')).toBeInTheDocument();
  });

  it('renders type filter dropdown with correct options', () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('shows compliance tab with PSD2 checklist', async () => {
    setupHandlers();
    renderWithProviders(<OpenBankingPage />);
    screen.getByText('Compliance').click();
    await waitFor(() => {
      expect(screen.getByText('PSD2 Compliance Score')).toBeInTheDocument();
    });
    expect(screen.getByText('Strong Customer Authentication (SCA)')).toBeInTheDocument();
  });
});
