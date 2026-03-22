import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { MerchantAcquiringPage } from '../pages/MerchantAcquiringPage';

// ─── Response wrapper matching ApiResponse ────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockMerchants = [
  {
    id: 1, merchantId: 'MCH-ABCDEF1234', merchantName: 'Acme Retail Ltd', tradingName: 'Acme',
    merchantCategoryCode: '5411', businessType: 'LIMITED_COMPANY', registrationNumber: 'RC-100001',
    contactEmail: 'info@acme.com', settlementAccountId: 101, settlementFrequency: 'DAILY',
    mdrRate: 1.5, terminalCount: 3, riskCategory: 'LOW', chargebackRate: 0.02,
    monitoringLevel: 'STANDARD', status: 'ACTIVE', onboardedAt: '2026-01-15T10:00:00Z',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 2, merchantId: 'MCH-GHIJKL5678', merchantName: 'Globe Electronics', tradingName: 'Globe',
    merchantCategoryCode: '5732', businessType: 'PLC', registrationNumber: 'RC-200002',
    contactEmail: 'contact@globe.com', settlementAccountId: 102, settlementFrequency: 'DAILY',
    mdrRate: 2.0, terminalCount: 0, riskCategory: 'HIGH', chargebackRate: 3.5,
    monitoringLevel: 'ENHANCED', status: 'PENDING', createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 3, merchantId: 'MCH-MNOPQR9012', merchantName: 'Suspended Store', tradingName: 'SS',
    merchantCategoryCode: '5999', businessType: 'SOLE_PROPRIETOR', registrationNumber: 'RC-300003',
    contactEmail: 'ss@store.com', settlementAccountId: 103, settlementFrequency: 'WEEKLY',
    mdrRate: 1.75, terminalCount: 1, riskCategory: 'MEDIUM', chargebackRate: 1.0,
    monitoringLevel: 'STANDARD', status: 'SUSPENDED', createdAt: '2026-01-20T08:00:00Z',
  },
];

const mockActiveMerchants = mockMerchants.filter((m) => m.status === 'ACTIVE');
const mockHighRisk = mockMerchants.filter((m) => m.riskCategory === 'HIGH');

const mockFacilities = [
  {
    id: 1, merchantId: 1, facilityType: 'CARD_PRESENT', processorConnection: 'VISA',
    terminalIdPrefix: 'POS-', settlementCurrency: 'NGN', settlementCycle: 'T1',
    mdrRatePct: 1.5, dailyTransactionLimit: 50000, monthlyVolumeLimit: 1000000,
    chargebackLimitPct: 1.0, reserveHoldPct: 5.0, reserveBalance: 2500,
    pciComplianceStatus: 'COMPLIANT', pciComplianceDate: '2026-06-15',
    fraudScreeningEnabled: true, threeDSecureEnabled: false, status: 'ACTIVE',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 2, merchantId: 2, facilityType: 'ECOMMERCE', processorConnection: 'MASTERCARD',
    settlementCurrency: 'NGN', settlementCycle: 'T2',
    mdrRatePct: 2.0, reserveBalance: 0,
    pciComplianceStatus: 'PENDING_SAQ',
    fraudScreeningEnabled: true, threeDSecureEnabled: true, status: 'SETUP',
    createdAt: '2026-02-05T10:00:00Z',
  },
];

const mockChargebacks = [
  {
    id: 1, merchantId: 1, originalTransactionRef: 'TXN-2026-001', transactionDate: '2026-03-01',
    transactionAmount: 15000, cardNetwork: 'VISA', reasonCode: '4853',
    reasonDescription: 'Goods not received', chargebackAmount: 15000, currency: 'NGN',
    evidenceDeadline: '2026-04-01', representmentSubmitted: false, arbitrationRequired: false,
    status: 'RECEIVED', createdAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 2, merchantId: 1, originalTransactionRef: 'TXN-2026-002', transactionDate: '2026-02-15',
    transactionAmount: 8000, cardNetwork: 'MASTERCARD', reasonCode: '4837',
    reasonDescription: 'No cardholder authorization', chargebackAmount: 8000, currency: 'NGN',
    representmentSubmitted: true, arbitrationRequired: false,
    status: 'REPRESENTMENT', createdAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 3, merchantId: 2, originalTransactionRef: 'TXN-2026-003', transactionDate: '2026-01-10',
    transactionAmount: 5000, cardNetwork: 'VERVE', reasonCode: '83',
    reasonDescription: 'Fraud', chargebackAmount: 5000, currency: 'NGN',
    representmentSubmitted: false, arbitrationRequired: false, outcome: 'MERCHANT_LOSS',
    status: 'CLOSED', createdAt: '2026-01-15T10:00:00Z',
  },
];

const mockTerminals = [
  {
    id: 1, terminalId: 'POS-001', terminalType: 'COUNTERTOP', merchantId: 'MCH-ABCDEF1234',
    merchantName: 'Acme Retail Ltd', merchantCategoryCode: '5411', locationAddress: '123 Main St, Lagos',
    supportsContactless: true, supportsChip: true, supportsMagstripe: false, supportsPin: true, supportsQr: false,
    maxTransactionAmount: 500000, acquiringBankCode: 'ACME-BNK', batchSettlementTime: '23:00',
    transactionsToday: 42, operationalStatus: 'ACTIVE', lastHeartbeatAt: '2026-03-22T09:00:00Z',
    softwareVersion: 'v2.4.1', createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 2, terminalId: 'POS-002', terminalType: 'MOBILE', merchantId: 'MCH-ABCDEF1234',
    merchantName: 'Acme Retail Ltd', locationAddress: '456 Branch Rd, Lagos',
    supportsContactless: true, supportsChip: true, supportsMagstripe: true, supportsPin: true, supportsQr: true,
    batchSettlementTime: '23:00', transactionsToday: 10, operationalStatus: 'SUSPENDED',
    softwareVersion: 'v2.3.0', createdAt: '2026-02-01T10:00:00Z',
  },
];

const mockSettlements = [
  {
    id: 1, merchantId: 1, facilityId: 1, settlementDate: '2026-03-20',
    grossTransactionAmount: 50000, transactionCount: 667, mdrDeducted: 750,
    otherFeesDeducted: 75, chargebackDeductions: 0, refundDeductions: 0, reserveHeld: 2500,
    netSettlementAmount: 46675, settlementReference: 'STL-1-2026-03-20',
    status: 'CALCULATED', createdAt: '2026-03-20T23:00:00Z',
  },
];

const mockPciReport = {
  COMPLIANT: [mockFacilities[0]],
  PENDING_SAQ: [mockFacilities[1]],
};

// ─── Handler Setup ────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/merchants', () => HttpResponse.json(wrap(mockMerchants))),
    http.get('/api/v1/merchants/active', () => HttpResponse.json(wrap(mockActiveMerchants))),
    http.get('/api/v1/merchants/high-risk', () => HttpResponse.json(wrap(mockHighRisk))),
    http.get('/api/v1/acquiring/facilities', () => HttpResponse.json(wrap(mockFacilities))),
    http.get('/api/v1/acquiring/chargebacks', () => HttpResponse.json(wrap(mockChargebacks))),
    http.get('/api/v1/acquiring/compliance/pci', () => HttpResponse.json(wrap(mockPciReport))),
    http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap(mockTerminals))),
    http.get('/api/v1/acquiring/settlements/merchant/:merchantId', () =>
      HttpResponse.json(wrap(mockSettlements)),
    ),
    http.post('/api/v1/merchants', () =>
      HttpResponse.json(wrap({ ...mockMerchants[0], id: 99, merchantId: 'MCH-NEW000001', status: 'PENDING' }), { status: 201 }),
    ),
    http.post('/api/v1/merchants/:merchantId/activate', () =>
      HttpResponse.json(wrap({ ...mockMerchants[1], status: 'ACTIVE' })),
    ),
    http.post('/api/v1/merchants/:merchantId/suspend', () =>
      HttpResponse.json(wrap({ ...mockMerchants[0], status: 'SUSPENDED' })),
    ),
    http.post('/api/v1/acquiring/facilities', () =>
      HttpResponse.json(wrap({ ...mockFacilities[0], id: 99 }), { status: 201 }),
    ),
    http.put('/api/v1/acquiring/facilities/:id/activate', () =>
      HttpResponse.json(wrap({ ...mockFacilities[1], status: 'ACTIVE' })),
    ),
    http.post('/api/v1/acquiring/settlements/process', () =>
      HttpResponse.json(wrap(mockSettlements[0]), { status: 201 }),
    ),
    http.post('/api/v1/acquiring/chargebacks', () =>
      HttpResponse.json(wrap({ ...mockChargebacks[0], id: 99 }), { status: 201 }),
    ),
    http.post('/api/v1/acquiring/chargebacks/:id/representment', () =>
      HttpResponse.json(wrap({ ...mockChargebacks[0], status: 'REPRESENTMENT', representmentSubmitted: true })),
    ),
    http.post('/api/v1/pos-terminals', () =>
      HttpResponse.json(wrap({ ...mockTerminals[0], id: 99, terminalId: 'POS-NEW' }), { status: 201 }),
    ),
    http.post('/api/v1/pos-terminals/:terminalId/status', () =>
      HttpResponse.json(wrap({ ...mockTerminals[0], operationalStatus: 'SUSPENDED' })),
    ),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MerchantAcquiringPage', () => {
  // ── Page Structure ────────────────────────────────────────────────────────

  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
    expect(screen.getByText('Merchant Acquiring')).toBeInTheDocument();
  });

  it('renders all six tab buttons', () => {
    setupHandlers();
    renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
    expect(screen.getByText('Merchants')).toBeInTheDocument();
    expect(screen.getByText('Facilities')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
    expect(screen.getByText('Chargebacks')).toBeInTheDocument();
    expect(screen.getByText('Terminals')).toBeInTheDocument();
    expect(screen.getByText('PCI Compliance')).toBeInTheDocument();
  });

  it('renders KPI cards', async () => {
    setupHandlers();
    renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
    await waitFor(() => {
      expect(screen.getByText('Total Merchants')).toBeInTheDocument();
      expect(screen.getByText('High Risk')).toBeInTheDocument();
      expect(screen.getByText('Active Terminals')).toBeInTheDocument();
      expect(screen.getByText('Chargebacks Pending')).toBeInTheDocument();
    });
  });

  it('renders subtitle text', () => {
    setupHandlers();
    renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
    expect(screen.getByText(/merchant onboarding, settlement processing/i)).toBeInTheDocument();
  });

  // ── Merchants Tab ─────────────────────────────────────────────────────────

  describe('Merchants Tab', () => {
    it('renders all merchants from API (not just active)', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
        expect(screen.getByText('Globe Electronics')).toBeInTheDocument();
        expect(screen.getByText('Suspended Store')).toBeInTheDocument();
      });
    });

    it('renders status filter buttons', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        // Use getAllByText since "Active" appears in both the filter and KPI card
        expect(screen.getAllByText(/^All/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/^Pending/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/^Active/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/^Suspended/).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('filters merchants by status', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });

      // Click "Pending" filter
      const pendingBtn = screen.getByText(/^Pending/);
      fireEvent.click(pendingBtn);

      await waitFor(() => {
        expect(screen.getByText('Globe Electronics')).toBeInTheDocument();
        expect(screen.queryByText('Acme Retail Ltd')).not.toBeInTheDocument();
        expect(screen.queryByText('Suspended Store')).not.toBeInTheDocument();
      });
    });

    it('filters merchants by search query', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search merchants...');
      fireEvent.change(searchInput, { target: { value: 'Globe' } });

      await waitFor(() => {
        expect(screen.getByText('Globe Electronics')).toBeInTheDocument();
        expect(screen.queryByText('Acme Retail Ltd')).not.toBeInTheDocument();
      });
    });

    it('shows Onboard Merchant button for admins', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      expect(screen.getByText('Onboard Merchant')).toBeInTheDocument();
    });

    it('shows Activate button for PENDING merchants', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Globe Electronics')).toBeInTheDocument();
      });
      // Globe Electronics is PENDING - should have Activate button
      expect(screen.getAllByText('Activate').length).toBeGreaterThanOrEqual(1);
    });

    it('shows Suspend button for ACTIVE merchants', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });
      expect(screen.getAllByText('Suspend').length).toBeGreaterThanOrEqual(1);
    });

    it('opens onboard dialog on button click', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      fireEvent.click(screen.getByText('Onboard Merchant'));
      await waitFor(() => {
        expect(screen.getByText('Onboard Merchant', { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Acme Retail Ltd')).toBeInTheDocument();
      });
    });

    it('opens suspend dialog on suspend click', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });

      const suspendButtons = screen.getAllByText('Suspend');
      // Click the first Suspend button (row action, not filter)
      const rowSuspendBtn = suspendButtons.find((btn) =>
        btn.closest('td') !== null,
      );
      if (rowSuspendBtn) {
        fireEvent.click(rowSuspendBtn);
        await waitFor(() => {
          expect(screen.getByText('Suspend Merchant', { selector: 'h3' })).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/compliance violation/i)).toBeInTheDocument();
        });
      }
    });

    it('shows merchant MCC codes', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('5411')).toBeInTheDocument();
        expect(screen.getByText('5732')).toBeInTheDocument();
      });
    });

    it('shows risk category badges', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('LOW')).toBeInTheDocument();
        expect(screen.getByText('HIGH')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      });
    });

    it('shows empty state when no merchants match filter', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });
      const searchInput = screen.getByPlaceholderText('Search merchants...');
      fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_MERCHANT_XYZ' } });
      await waitFor(() => {
        expect(screen.getByText(/no merchants match/i)).toBeInTheDocument();
      });
    });
  });

  // ── Chargebacks Tab ───────────────────────────────────────────────────────

  describe('Chargebacks Tab', () => {
    it('renders chargeback data after switching to tab', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      await waitFor(() => {
        expect(screen.getByText('TXN-2026-001')).toBeInTheDocument();
        expect(screen.getByText('TXN-2026-002')).toBeInTheDocument();
      });
    });

    it('shows pending chargebacks alert', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      await waitFor(() => {
        expect(screen.getByText(/chargeback.*require attention/i)).toBeInTheDocument();
      });
    });

    it('shows Record Chargeback button', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      expect(screen.getByText('Record Chargeback')).toBeInTheDocument();
    });

    it('opens record chargeback dialog', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      fireEvent.click(screen.getByText('Record Chargeback'));
      await waitFor(() => {
        expect(screen.getByText('Record Chargeback', { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('TXN-20260101-001')).toBeInTheDocument();
      });
    });

    it('shows Representment button for actionable chargebacks', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      await waitFor(() => {
        expect(screen.getAllByText('Representment').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows chargeback status badges', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      await waitFor(() => {
        expect(screen.getByText('RECEIVED')).toBeInTheDocument();
        expect(screen.getByText('REPRESENTMENT')).toBeInTheDocument();
        expect(screen.getByText('CLOSED')).toBeInTheDocument();
      });
    });

    it('filters chargebacks by status', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      await waitFor(() => {
        expect(screen.getByText('TXN-2026-001')).toBeInTheDocument();
      });

      // Click "Closed" filter
      const closedBtn = screen.getByText(/^Closed/);
      fireEvent.click(closedBtn);
      await waitFor(() => {
        expect(screen.getByText('TXN-2026-003')).toBeInTheDocument();
        expect(screen.queryByText('TXN-2026-001')).not.toBeInTheDocument();
      });
    });

    it('shows card networks', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks' });
      await waitFor(() => {
        expect(screen.getAllByText('VISA').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('MASTERCARD').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ── Facilities Tab ────────────────────────────────────────────────────────

  describe('Facilities Tab', () => {
    it('renders facilities list', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      await waitFor(() => {
        expect(screen.getByText('Merchant #1')).toBeInTheDocument();
        expect(screen.getByText('Merchant #2')).toBeInTheDocument();
      });
    });

    it('shows Setup Facility button', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      expect(screen.getByText('Setup Facility')).toBeInTheDocument();
    });

    it('opens setup facility dialog', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      fireEvent.click(screen.getByText('Setup Facility'));
      await waitFor(() => {
        expect(screen.getByText('Setup Acquiring Facility')).toBeInTheDocument();
      });
    });

    it('shows Activate button for non-active facilities', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      await waitFor(() => {
        // The SETUP facility should have an Activate action
        expect(screen.getAllByText('Activate').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays facility type and processor', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      await waitFor(() => {
        expect(screen.getByText('CARD_PRESENT')).toBeInTheDocument();
        expect(screen.getByText('ECOMMERCE')).toBeInTheDocument();
      });
    });

    it('shows PCI compliance status', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      await waitFor(() => {
        expect(screen.getByText('COMPLIANT')).toBeInTheDocument();
        expect(screen.getByText('PENDING SAQ')).toBeInTheDocument();
      });
    });

    it('shows active and total facility counts', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities' });
      await waitFor(() => {
        expect(screen.getByText(/2 facilities/)).toBeInTheDocument();
        expect(screen.getByText(/1 active/)).toBeInTheDocument();
      });
    });
  });

  // ── Settlements Tab ───────────────────────────────────────────────────────

  describe('Settlements Tab', () => {
    it('shows merchant selector', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=settlements' });
      await waitFor(() => {
        expect(screen.getByText('Select Merchant')).toBeInTheDocument();
      });
    });

    it('shows empty state when no merchant selected', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=settlements' });
      await waitFor(() => {
        expect(screen.getByText('Select a merchant to view settlements')).toBeInTheDocument();
      });
    });

    it('renders settlement data when merchant is selected', async () => {
      setupHandlers();
      const { container } = renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=settlements' });

      // Wait for merchant options to load into the select
      await waitFor(() => {
        const options = container.querySelectorAll('select option');
        expect(options.length).toBeGreaterThan(1);
      });

      // Select Acme merchant
      const select = container.querySelector('select')!;
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('CALCULATED')).toBeInTheDocument();
      });
    });

    it('shows Process Settlement button after selecting merchant', async () => {
      setupHandlers();
      const { container } = renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=settlements' });

      await waitFor(() => {
        const options = container.querySelectorAll('select option');
        expect(options.length).toBeGreaterThan(1);
      });

      const select = container.querySelector('select')!;
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('Process Settlement')).toBeInTheDocument();
      });
    });

    it('shows settlement reference', async () => {
      setupHandlers();
      const { container } = renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=settlements' });

      await waitFor(() => {
        const options = container.querySelectorAll('select option');
        expect(options.length).toBeGreaterThan(1);
      });

      const select = container.querySelector('select')!;
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('STL-1-2026-03-20')).toBeInTheDocument();
      });
    });
  });

  // ── Terminals Tab ─────────────────────────────────────────────────────────

  describe('Terminals Tab', () => {
    it('renders terminal list', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText('POS-001')).toBeInTheDocument();
        expect(screen.getByText('POS-002')).toBeInTheDocument();
      });
    });

    it('shows Register Terminal button for admins', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      expect(screen.getByText('Register Terminal')).toBeInTheDocument();
    });

    it('shows terminal capabilities', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getAllByText('NFC').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Chip').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('PIN').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows terminal status badges', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
      });
    });

    it('shows status action buttons', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        // Active terminal should have Suspend + Maintenance + Decommission
        const suspendBtns = screen.getAllByText('Suspend');
        expect(suspendBtns.length).toBeGreaterThanOrEqual(1);

        expect(screen.getAllByText('Maintenance').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Decommission').length).toBeGreaterThanOrEqual(1);

        // Suspended terminal should have Activate
        const activateBtns = screen.getAllByText('Activate');
        expect(activateBtns.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('filters terminals by status', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText('POS-001')).toBeInTheDocument();
      });

      // Click Suspended filter
      const buttons = screen.getAllByText(/^Suspended/);
      const filterBtn = buttons.find((b) => !b.closest('td'));
      if (filterBtn) {
        fireEvent.click(filterBtn);
        await waitFor(() => {
          expect(screen.getByText('POS-002')).toBeInTheDocument();
          expect(screen.queryByText('POS-001')).not.toBeInTheDocument();
        });
      }
    });

    it('filters terminals by search', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText('POS-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search terminals...');
      fireEvent.change(searchInput, { target: { value: 'POS-002' } });

      await waitFor(() => {
        expect(screen.getByText('POS-002')).toBeInTheDocument();
        expect(screen.queryByText('POS-001')).not.toBeInTheDocument();
      });
    });

    it('opens register terminal dialog', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      fireEvent.click(screen.getByText('Register Terminal'));
      await waitFor(() => {
        expect(screen.getByText('Register POS Terminal')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('POS-001')).toBeInTheDocument();
      });
    });

    it('shows heartbeat info', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText('Never')).toBeInTheDocument();
      });
    });

    it('shows terminal counts', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText(/2 terminals/)).toBeInTheDocument();
        expect(screen.getByText(/1 active/)).toBeInTheDocument();
      });
    });
  });

  // ── PCI Compliance Tab ────────────────────────────────────────────────────

  describe('PCI Compliance Tab', () => {
    it('renders PCI compliance report', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=pci' });
      await waitFor(() => {
        expect(screen.getByText(/PCI DSS Compliance/)).toBeInTheDocument();
        expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
      });
    });

    it('shows compliance group cards', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=pci' });
      await waitFor(() => {
        expect(screen.getByText('Compliant')).toBeInTheDocument();
        expect(screen.getByText('Non-Compliant')).toBeInTheDocument();
        expect(screen.getByText('Pending SAQ')).toBeInTheDocument();
        expect(screen.getByText('Pending ASV')).toBeInTheDocument();
      });
    });

    it('shows empty state when no PCI data', async () => {
      server.use(
        http.get('/api/v1/merchants', () => HttpResponse.json(wrap(mockMerchants))),
        http.get('/api/v1/merchants/active', () => HttpResponse.json(wrap(mockActiveMerchants))),
        http.get('/api/v1/merchants/high-risk', () => HttpResponse.json(wrap(mockHighRisk))),
        http.get('/api/v1/acquiring/chargebacks', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/acquiring/compliance/pci', () => HttpResponse.json(wrap({}))),
      );
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=pci' });
      await waitFor(() => {
        expect(screen.getByText(/no pci compliance data/i)).toBeInTheDocument();
      });
    });
  });

  // ── Error States ──────────────────────────────────────────────────────────

  describe('Error States', () => {
    it('shows error state for merchants tab on API failure', async () => {
      server.use(
        http.get('/api/v1/merchants', () => HttpResponse.json({ success: false, message: 'Server error' }, { status: 500 })),
        http.get('/api/v1/merchants/active', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/merchants/high-risk', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/acquiring/chargebacks', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap([]))),
      );
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText(/failed to load merchants/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      server.use(
        http.get('/api/v1/merchants', () => HttpResponse.json({ success: false, message: 'Server error' }, { status: 500 })),
        http.get('/api/v1/merchants/active', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/merchants/high-risk', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/acquiring/chargebacks', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap([]))),
      );
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  // ── Tab Navigation ────────────────────────────────────────────────────────

  describe('Tab Navigation', () => {
    it('switches to chargebacks tab on click', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });

      const chargebacksTab = screen.getAllByText('Chargebacks').find(
        (el) => el.closest('button') && !el.closest('td'),
      );
      if (chargebacksTab) {
        fireEvent.click(chargebacksTab);
        await waitFor(() => {
          expect(screen.getByText('Record Chargeback')).toBeInTheDocument();
        });
      }
    });

    it('defaults to merchants tab', () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      expect(screen.getByPlaceholderText('Search merchants...')).toBeInTheDocument();
    });

    it('respects tab query param', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      await waitFor(() => {
        expect(screen.getByText('Register Terminal')).toBeInTheDocument();
      });
    });
  });

  // ── Role-Based Visibility ─────────────────────────────────────────────────

  describe('Role-Based Visibility', () => {
    const officerUser = createMockUser({ roles: ['CBS_OFFICER'] });

    it('officer can view the page and all tabs', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring', user: officerUser });
      expect(screen.getByText('Merchant Acquiring')).toBeInTheDocument();
      expect(screen.getByText('Merchants')).toBeInTheDocument();
      expect(screen.getByText('Facilities')).toBeInTheDocument();
      expect(screen.getByText('Settlements')).toBeInTheDocument();
      expect(screen.getByText('Chargebacks')).toBeInTheDocument();
      expect(screen.getByText('Terminals')).toBeInTheDocument();
      expect(screen.getByText('PCI Compliance')).toBeInTheDocument();
    });

    it('officer can see merchant data', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring', user: officerUser });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });
    });

    it('officer cannot see Onboard Merchant button', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring', user: officerUser });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });
      expect(screen.queryByText('Onboard Merchant')).not.toBeInTheDocument();
    });

    it('officer cannot see Activate/Suspend row actions on merchants', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring', user: officerUser });
      await waitFor(() => {
        expect(screen.getByText('Acme Retail Ltd')).toBeInTheDocument();
      });
      // No Activate or Suspend buttons in rows for officer
      const actionButtons = screen.queryAllByText('Activate');
      const suspendButtons = screen.queryAllByText('Suspend');
      // Filter to only row action buttons (inside td elements)
      const rowActivateButtons = actionButtons.filter((btn) => btn.closest('td'));
      const rowSuspendButtons = suspendButtons.filter((btn) => btn.closest('td'));
      expect(rowActivateButtons).toHaveLength(0);
      expect(rowSuspendButtons).toHaveLength(0);
    });

    it('officer cannot see Register Terminal button', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals', user: officerUser });
      await waitFor(() => {
        expect(screen.getByText('POS-001')).toBeInTheDocument();
      });
      expect(screen.queryByText('Register Terminal')).not.toBeInTheDocument();
    });

    it('officer cannot see terminal status action buttons', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals', user: officerUser });
      await waitFor(() => {
        expect(screen.getByText('POS-001')).toBeInTheDocument();
      });
      // No Suspend/Decommission action buttons in terminal rows
      const decommissionBtns = screen.queryAllByText('Decommission');
      const rowDecommBtns = decommissionBtns.filter((btn) => btn.closest('td'));
      expect(rowDecommBtns).toHaveLength(0);
    });

    it('officer CAN see Record Chargeback button (officer-level action)', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=chargebacks', user: officerUser });
      expect(screen.getByText('Record Chargeback')).toBeInTheDocument();
    });

    it('officer CAN see Setup Facility button (officer-level action)', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=facilities', user: officerUser });
      expect(screen.getByText('Setup Facility')).toBeInTheDocument();
    });

    it('officer CAN see Process Settlement button after selecting merchant', async () => {
      setupHandlers();
      const { container } = renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=settlements', user: officerUser });

      await waitFor(() => {
        const options = container.querySelectorAll('select option');
        expect(options.length).toBeGreaterThan(1);
      });

      const select = container.querySelector('select')!;
      fireEvent.change(select, { target: { value: '1' } });

      await waitFor(() => {
        expect(screen.getByText('Process Settlement')).toBeInTheDocument();
      });
    });

    it('admin CAN see Onboard Merchant button', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring' });
      expect(screen.getByText('Onboard Merchant')).toBeInTheDocument();
    });

    it('admin CAN see Register Terminal button', async () => {
      setupHandlers();
      renderWithProviders(<MerchantAcquiringPage />, { route: '/acquiring?tab=terminals' });
      expect(screen.getByText('Register Terminal')).toBeInTheDocument();
    });
  });
});
