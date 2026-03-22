import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { VaultOperationsPage } from '../pages/VaultOperationsPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_VAULTS = {
  data: [
    { id: 1, vaultCode: 'V-MAIN-001', vaultName: 'Main Vault', branchCode: 'HEAD', vaultType: 'MAIN', currencyCode: 'NGN', currentBalance: 50000000, minimumBalance: 5000000, maximumBalance: 100000000, insuranceLimit: 80000000, custodian: 'John Smith', status: 'ACTIVE' },
    { id: 2, vaultCode: 'V-ATM-001', vaultName: 'ATM Vault 1', branchCode: 'HEAD', vaultType: 'ATM', currencyCode: 'NGN', currentBalance: 2000000, minimumBalance: 500000, maximumBalance: 5000000, insuranceLimit: null, custodian: null, status: 'ACTIVE' },
    { id: 3, vaultCode: 'V-TELLER-001', vaultName: 'Teller 1', branchCode: 'HEAD', vaultType: 'TELLER', currencyCode: 'NGN', currentBalance: 800000, minimumBalance: 100000, maximumBalance: 2000000, insuranceLimit: null, custodian: 'Jane Doe', status: 'ACTIVE' },
  ],
};

const MOCK_TRANSACTIONS = {
  data: [
    { id: 1, transactionType: 'CASH_IN', amount: 5000000, runningBalance: 50000000, currencyCode: 'NGN', reference: 'CIT-2026-001', narration: 'CIT delivery', performedBy: 'admin', approvedBy: 'manager', createdAt: '2026-03-22T09:00:00Z', version: 1 },
    { id: 2, transactionType: 'CASH_OUT', amount: 2000000, runningBalance: 48000000, currencyCode: 'NGN', reference: 'OUT-2026-001', narration: 'ATM replenishment', performedBy: 'admin', approvedBy: null, createdAt: '2026-03-22T10:00:00Z', version: 1 },
  ],
};

const MOCK_CASH_VAULTS = {
  data: [
    { id: 1, vaultCode: 'CV-001', vaultName: 'Central Cash Vault', vaultType: 'CENTRAL', branchId: null, currency: 'NGN', totalBalance: 200000000, denominationBreakdown: null, insuranceLimit: 500000000, lastCountedAt: '2026-03-22T08:00:00Z', lastReconciledAt: '2026-03-21T22:00:00Z', custodianName: 'Treasury Dept', dualControl: true, status: 'ACTIVE' },
  ],
};

const MOCK_MOVEMENTS = {
  data: [
    { id: 1, movementRef: 'MOV-001', fromVaultCode: 'CV-001', toVaultCode: 'V-MAIN-001', movementType: 'TRANSFER', currency: 'NGN', amount: 10000000, citCompany: 'SecureCash Ltd', sealNumber: 'SEAL-12345', escortCount: 2, authorizedBy: 'treasury_mgr', receivedBy: null, scheduledDate: '2026-03-22', actualDate: null, status: 'SCHEDULED' },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/vaults', () => HttpResponse.json(MOCK_VAULTS)),
    http.get('/api/v1/vaults/transactions', () => HttpResponse.json(MOCK_TRANSACTIONS)),
    http.get('/api/v1/vaults/branch/:branchCode', () => HttpResponse.json(MOCK_VAULTS)),
    http.get('/api/v1/vaults/:id', () => HttpResponse.json({ data: MOCK_VAULTS.data[0] })),
    http.get('/api/v1/vaults/:id/transactions', () => HttpResponse.json(MOCK_TRANSACTIONS)),
    http.post('/api/v1/vaults', () =>
      HttpResponse.json({ data: MOCK_VAULTS.data[0] }, { status: 201 }),
    ),
    http.get('/api/v1/cash-vaults/type/:type', () => HttpResponse.json(MOCK_CASH_VAULTS)),
    http.get('/api/v1/cash-vaults/movements', () => HttpResponse.json(MOCK_MOVEMENTS)),
    http.get('/api/v1/cash-vaults/:code/movements', () => HttpResponse.json(MOCK_MOVEMENTS)),
    http.post('/api/v1/vaults/:id/cash-in', () =>
      HttpResponse.json({ data: MOCK_TRANSACTIONS.data[0] }),
    ),
    http.post('/api/v1/vaults/:id/cash-out', () =>
      HttpResponse.json({ data: MOCK_TRANSACTIONS.data[1] }),
    ),
    http.post('/api/v1/vaults/transfer', () =>
      HttpResponse.json({ data: null }),
    ),
    http.post('/api/v1/cash-vaults', () =>
      HttpResponse.json({ data: MOCK_CASH_VAULTS.data[0] }, { status: 201 }),
    ),
    http.post('/api/v1/cash-vaults/movements', () =>
      HttpResponse.json({ data: MOCK_MOVEMENTS.data[0] }, { status: 201 }),
    ),
    http.post('/api/v1/cash-vaults/movements/:ref/confirm', () =>
      HttpResponse.json({ data: MOCK_MOVEMENTS.data[0] }),
    ),
    http.post('/api/v1/cash-vaults/:code/reconcile', () =>
      HttpResponse.json({ data: MOCK_CASH_VAULTS.data[0] }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VaultOperationsPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<VaultOperationsPage />);
    expect(screen.getByRole('heading', { name: 'Vault & Cash Management' })).toBeInTheDocument();
  });

  it('displays vault cards or table', async () => {
    setupHandlers();
    renderWithProviders(<VaultOperationsPage />);
    await waitFor(() => {
      expect(screen.getByText('V-MAIN-001')).toBeInTheDocument();
    });
  });

  it('has cash-in action available', async () => {
    setupHandlers();
    renderWithProviders(<VaultOperationsPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^In$/ }).length).toBeGreaterThan(0);
    });
  });

  it('has cash-out action available', async () => {
    setupHandlers();
    renderWithProviders(<VaultOperationsPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Out$/ }).length).toBeGreaterThan(0);
    });
  });

  it('has transfer action available', async () => {
    setupHandlers();
    renderWithProviders(<VaultOperationsPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Transfer$/ }).length).toBeGreaterThan(0);
    });
  });
});
