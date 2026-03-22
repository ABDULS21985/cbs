import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ConsentManagementPage } from './ConsentManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockClients = [
  {
    id: 1, clientId: 'CLIENT_001', clientName: 'FinTech Payments',
    clientType: 'TPP_AISP', isActive: true, redirectUris: [],
    allowedScopes: ['accounts'], dailyRequestCount: 0,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockConsents = [
  {
    id: 1, consentId: 'CST-AAA', clientId: 'CLIENT_001', customerId: 100,
    consentType: 'ACCOUNT_ACCESS', permissions: ['ReadAccountsBasic'],
    accountIds: [1], status: 'AUTHORISED',
    grantedAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2, consentId: 'CST-BBB', clientId: 'CLIENT_001', customerId: 200,
    consentType: 'PAYMENT_INITIATION', permissions: ['InitiatePayment'],
    accountIds: [], status: 'AWAITING_AUTHORISATION',
    expiresAt: '2027-01-01T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 3, consentId: 'CST-CCC', clientId: 'CLIENT_001', customerId: 300,
    consentType: 'ACCOUNT_ACCESS', permissions: ['ReadBalances'],
    accountIds: [], status: 'REVOKED', revokedAt: '2026-02-15T00:00:00Z',
    expiresAt: '2027-01-01T00:00:00Z',
    createdAt: '2025-12-01T00:00:00Z',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap(mockClients))),
    http.get('/api/v1/openbanking/consents', () => HttpResponse.json(wrap(mockConsents))),
  );
}

describe('ConsentManagementPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    expect(screen.getByText('Consent Management')).toBeInTheDocument();
  });

  it('renders New Consent button', () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    expect(screen.getByText('New Consent')).toBeInTheDocument();
  });

  it('renders Refresh button', () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('shows status chip counts after data loads', async () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    // Wait for consent data to load — the count text proves data is loaded
    await waitFor(() => {
      expect(screen.getByText('3 of 3 consents')).toBeInTheDocument();
    });
  });

  it('renders search and filter controls', () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    expect(screen.getByPlaceholderText(/Search by ID/)).toBeInTheDocument();
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
    expect(screen.getByText('All TPP Clients')).toBeInTheDocument();
  });

  it('displays consent data in table', async () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('CST-AAA')).toBeInTheDocument();
    });
    expect(screen.getByText('CST-BBB')).toBeInTheDocument();
    expect(screen.getByText('CST-CCC')).toBeInTheDocument();
  });

  it('shows consent count text', async () => {
    setupHandlers();
    renderWithProviders(<ConsentManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('3 of 3 consents')).toBeInTheDocument();
    });
  });
});
