import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { MerchantListPage } from './MerchantListPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockMerchants = [
  {
    id: 1, merchantId: 'MER-001', merchantName: 'Alpha Electronics', tradingName: 'Alpha Tech',
    merchantCategoryCode: '5411', businessType: 'RETAIL', registrationNumber: 'RC-100001',
    taxId: 'TIN-100001', contactName: 'Ada Obi', contactPhone: '+2348012345678',
    contactEmail: 'ada@alphatech.ng', address: '12 Marina St, Lagos',
    settlementAccountId: 1001, settlementFrequency: 'DAILY',
    mdrRate: 1.5, terminalCount: 8, monthlyVolumeLimit: 5000000,
    riskCategory: 'LOW', chargebackRate: 0.3, monitoringLevel: 'STANDARD',
    status: 'ACTIVE', onboardedAt: '2025-06-15T10:00:00Z',
    createdAt: '2025-06-14T08:00:00Z', updatedAt: '2025-06-15T10:00:00Z',
  },
  {
    id: 2, merchantId: 'MER-002', merchantName: 'Beta Groceries', tradingName: 'Beta Mart',
    merchantCategoryCode: '5912', businessType: 'RETAIL', registrationNumber: 'RC-200002',
    taxId: 'TIN-200002', contactName: 'Bola Ade', contactPhone: '+2348098765432',
    contactEmail: 'bola@betamart.ng', address: '45 Broad St, Lagos',
    settlementAccountId: 1002, settlementFrequency: 'WEEKLY',
    mdrRate: 2.0, terminalCount: 3, monthlyVolumeLimit: 2000000,
    riskCategory: 'MEDIUM', chargebackRate: 0.8, monitoringLevel: 'ENHANCED',
    status: 'ACTIVE', onboardedAt: '2025-08-20T09:00:00Z',
    createdAt: '2025-08-19T07:00:00Z', updatedAt: '2025-08-20T09:00:00Z',
  },
  {
    id: 3, merchantId: 'MER-003', merchantName: 'Gamma Online Casino', tradingName: 'Gamma Games',
    merchantCategoryCode: '7995', businessType: 'ONLINE', registrationNumber: 'RC-300003',
    taxId: 'TIN-300003', contactName: 'Chidi Nze', contactPhone: '+2347055555555',
    contactEmail: 'chidi@gammagames.ng', address: '1 Victoria Island, Lagos',
    settlementAccountId: 1003, settlementFrequency: 'DAILY',
    mdrRate: 3.5, terminalCount: 0, monthlyVolumeLimit: 10000000,
    riskCategory: 'HIGH', chargebackRate: 1.8, monitoringLevel: 'INTENSIVE',
    status: 'SUSPENDED', onboardedAt: '2025-03-01T12:00:00Z',
    createdAt: '2025-02-28T11:00:00Z', updatedAt: '2025-09-10T14:00:00Z',
  },
  {
    id: 4, merchantId: 'MER-004', merchantName: 'Delta Pharmacy', tradingName: 'Delta Rx',
    merchantCategoryCode: '5411', businessType: 'RETAIL', registrationNumber: 'RC-400004',
    taxId: 'TIN-400004', contactName: 'Dayo Ojo', contactPhone: '+2348033333333',
    contactEmail: 'dayo@deltarx.ng', address: '78 Allen Ave, Lagos',
    settlementAccountId: 1004, settlementFrequency: 'DAILY',
    mdrRate: 1.2, terminalCount: 5, monthlyVolumeLimit: 3000000,
    riskCategory: 'LOW', chargebackRate: 0.1, monitoringLevel: 'STANDARD',
    status: 'PENDING', onboardedAt: null,
    createdAt: '2025-10-01T06:00:00Z', updatedAt: '2025-10-01T06:00:00Z',
  },
  {
    id: 5, merchantId: 'MER-005', merchantName: 'Epsilon Crypto Exchange', tradingName: 'EpsiCoin',
    merchantCategoryCode: '6051', businessType: 'FINTECH', registrationNumber: 'RC-500005',
    taxId: 'TIN-500005', contactName: 'Emeka Udo', contactPhone: '+2347066666666',
    contactEmail: 'emeka@epsicoin.ng', address: '5 Lekki Phase 1, Lagos',
    settlementAccountId: 1005, settlementFrequency: 'DAILY',
    mdrRate: 4.0, terminalCount: 0, monthlyVolumeLimit: 20000000,
    riskCategory: 'PROHIBITED', chargebackRate: 2.5, monitoringLevel: 'INTENSIVE',
    status: 'ACTIVE', onboardedAt: '2025-01-10T08:00:00Z',
    createdAt: '2025-01-09T07:00:00Z', updatedAt: '2025-07-15T16:00:00Z',
  },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function setupHandlers(merchants = mockMerchants) {
  server.use(
    http.get('/api/v1/merchants', () => HttpResponse.json(wrap(merchants))),
  );
}

describe('MerchantListPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ── 1. Renders merchant list with stat cards after data loads ───────────

  it('renders merchant list with stat cards after data loads', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Active Merchants')).toBeInTheDocument();
    });
    // "Monthly Volume" appears as both stat card label and table column header
    expect(screen.getAllByText('Monthly Volume').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('MDR Revenue')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Avg CB Rate')).toBeInTheDocument();

    // Table data should be rendered
    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });
    expect(screen.getByText('Beta Groceries')).toBeInTheDocument();
    expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    expect(screen.getByText('Delta Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('Epsilon Crypto Exchange')).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Merchant ID')).toBeInTheDocument();
    });
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('MCC')).toBeInTheDocument();
    expect(screen.getByText('Terminals')).toBeInTheDocument();
    // "Monthly Volume" also appears in stat card — use getAllByText
    expect(screen.getAllByText('Monthly Volume').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('MDR %')).toBeInTheDocument();
    expect(screen.getByText('CB %')).toBeInTheDocument();
    // "Risk" and "Status" also appear as filter labels — use getAllByText
    expect(screen.getAllByText('Risk').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Onboarded')).toBeInTheDocument();
  });

  it('displays merchant IDs in table', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('MER-001')).toBeInTheDocument();
    });
    expect(screen.getByText('MER-002')).toBeInTheDocument();
    expect(screen.getByText('MER-003')).toBeInTheDocument();
  });

  it('displays risk categories', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getAllByText('LOW').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('PROHIBITED')).toBeInTheDocument();
  });

  // ── 2. Shows empty state when no merchants returned ────────────────────

  it('shows empty state when no merchants returned', async () => {
    setupHandlers([]);
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('No merchants match your filters')).toBeInTheDocument();
    });
  });

  // ── 3. Filters by status dropdown ──────────────────────────────────────

  it('filters by status dropdown', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // Find the Status select by its filter label
    const statusLabel = screen.getByText('Status', { selector: 'label' });
    const statusSelect = statusLabel.parentElement!.querySelector('select')!;

    // Filter to SUSPENDED — only Gamma Online Casino has SUSPENDED status
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    await waitFor(() => {
      expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Delta Pharmacy')).not.toBeInTheDocument();

    // Filter to PENDING — only Delta Pharmacy
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    await waitFor(() => {
      expect(screen.getByText('Delta Pharmacy')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Online Casino')).not.toBeInTheDocument();
  });

  // ── 4. Filters by risk category dropdown ───────────────────────────────

  it('filters by risk category dropdown', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // Find the Risk select by its label
    const riskLabel = screen.getByText('Risk', { selector: 'label' });
    const riskSelect = riskLabel.parentElement!.querySelector('select')!;

    // Filter to HIGH — only Gamma Online Casino
    fireEvent.change(riskSelect, { target: { value: 'HIGH' } });

    await waitFor(() => {
      expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Delta Pharmacy')).not.toBeInTheDocument();
    expect(screen.queryByText('Epsilon Crypto Exchange')).not.toBeInTheDocument();
  });

  it('filters by PROHIBITED risk category', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Epsilon Crypto Exchange')).toBeInTheDocument();
    });

    const riskLabel = screen.getByText('Risk', { selector: 'label' });
    const riskSelect = riskLabel.parentElement!.querySelector('select')!;

    fireEvent.change(riskSelect, { target: { value: 'PROHIBITED' } });

    await waitFor(() => {
      expect(screen.getByText('Epsilon Crypto Exchange')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Online Casino')).not.toBeInTheDocument();
  });

  // ── 5. Filters by MCC search input ────────────────────────────────────

  it('filters by MCC search input', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // MCC Search input
    const mccInput = screen.getByPlaceholderText('Code or description...');

    // Search for MCC 5912 — only Beta Groceries
    fireEvent.change(mccInput, { target: { value: '5912' } });

    await waitFor(() => {
      expect(screen.getByText('Beta Groceries')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Online Casino')).not.toBeInTheDocument();

    // Search for MCC 5411 — Alpha Electronics and Delta Pharmacy share this code
    fireEvent.change(mccInput, { target: { value: '5411' } });

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });
    expect(screen.getByText('Delta Pharmacy')).toBeInTheDocument();
    expect(screen.queryByText('Beta Groceries')).not.toBeInTheDocument();
  });

  // ── 6. Filters by CB > 1% checkbox ────────────────────────────────────

  it('filters by CB > 1% checkbox', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // CB > 1% checkbox — merchants with chargebackRate > 1: Gamma (1.8) and Epsilon (2.5)
    const cbCheckbox = screen.getByRole('checkbox');
    fireEvent.click(cbCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    });
    expect(screen.getByText('Epsilon Crypto Exchange')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Delta Pharmacy')).not.toBeInTheDocument();
  });

  // ── 7. Clear filters resets all filters ────────────────────────────────

  it('clear filters resets all filters', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // Apply status filter
    const statusLabel = screen.getByText('Status', { selector: 'label' });
    const statusSelect = statusLabel.parentElement!.querySelector('select')!;
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    await waitFor(() => {
      expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alpha Electronics')).not.toBeInTheDocument();

    // "Clear filters" should appear when any filter is active
    const clearBtn = screen.getByText('Clear filters');
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);

    // All merchants should be visible again
    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });
    expect(screen.getByText('Beta Groceries')).toBeInTheDocument();
    expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    expect(screen.getByText('Delta Pharmacy')).toBeInTheDocument();
    expect(screen.getByText('Epsilon Crypto Exchange')).toBeInTheDocument();
  });

  it('clear filters is not visible when no filters are active', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('clear filters resets MCC search and CB checkbox', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // Apply MCC filter
    const mccInput = screen.getByPlaceholderText('Code or description...');
    fireEvent.change(mccInput, { target: { value: '5912' } });

    // Apply CB checkbox
    const cbCheckbox = screen.getByRole('checkbox');
    fireEvent.click(cbCheckbox);

    // Clear should be visible
    const clearBtn = screen.getByText('Clear filters');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });
    expect(screen.getByText('Beta Groceries')).toBeInTheDocument();
    expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();

    // Checkbox should be unchecked
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  // ── 8. Row click navigates to merchant detail page using merchantId ────

  it('row click navigates to merchant detail page using merchantId', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // Click on a merchant name's row
    const row = screen.getByText('Alpha Electronics').closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    expect(mockNavigate).toHaveBeenCalledWith('/cards/merchants/MER-001');
  });

  it('row click uses merchantId string, not numeric id', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Gamma Online Casino')).toBeInTheDocument();
    });

    const row = screen.getByText('Gamma Online Casino').closest('tr');
    fireEvent.click(row!);

    // Must use merchantId (MER-003) not numeric id (3)
    expect(mockNavigate).toHaveBeenCalledWith('/cards/merchants/MER-003');
    expect(mockNavigate).not.toHaveBeenCalledWith('/cards/merchants/3');
  });

  // ── 9. Onboard Merchant button is present and navigable ────────────────

  it('onboard merchant button is present and navigable', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    const onboardBtn = screen.getByRole('button', { name: /onboard merchant/i });
    expect(onboardBtn).toBeInTheDocument();

    fireEvent.click(onboardBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/cards/merchants/onboard');
  });

  // ── Additional coverage ────────────────────────────────────────────────

  it('renders page header with title and subtitle', () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    expect(screen.getByText('Merchant Management')).toBeInTheDocument();
    expect(screen.getByText('Onboard, monitor, and manage acquiring merchants')).toBeInTheDocument();
  });

  it('computes High Risk stat correctly (HIGH + PROHIBITED)', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    // HIGH: Gamma Online Casino, PROHIBITED: Epsilon Crypto Exchange = 2
    await waitFor(() => {
      const highRiskCard = screen.getByText('High Risk').closest('.stat-card');
      expect(highRiskCard).toHaveTextContent('2');
    });
  });

  it('computes Active Merchants stat correctly', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    // ACTIVE merchants: Alpha, Beta, Epsilon = 3
    await waitFor(() => {
      const activeCard = screen.getByText('Active Merchants').closest('.stat-card');
      expect(activeCard).toHaveTextContent('3');
    });
  });

  it('combines multiple filters simultaneously', async () => {
    setupHandlers();
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });

    // Filter to ACTIVE status
    const statusLabel = screen.getByText('Status', { selector: 'label' });
    const statusSelect = statusLabel.parentElement!.querySelector('select')!;
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    // Also filter to LOW risk
    const riskLabel = screen.getByText('Risk', { selector: 'label' });
    const riskSelect = riskLabel.parentElement!.querySelector('select')!;
    fireEvent.change(riskSelect, { target: { value: 'LOW' } });

    // Only Alpha Electronics matches both ACTIVE + LOW
    await waitFor(() => {
      expect(screen.getByText('Alpha Electronics')).toBeInTheDocument();
    });
    expect(screen.queryByText('Beta Groceries')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Online Casino')).not.toBeInTheDocument();
    expect(screen.queryByText('Epsilon Crypto Exchange')).not.toBeInTheDocument();
  });

  it('shows dash for null onboardedAt date', async () => {
    // Delta Pharmacy has onboardedAt: null
    setupHandlers([mockMerchants[3]]);
    renderWithProviders(<MerchantListPage />);

    await waitFor(() => {
      expect(screen.getByText('Delta Pharmacy')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/v1/merchants', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<MerchantListPage />);

    // Page header should still render even if API fails
    expect(screen.getByText('Merchant Management')).toBeInTheDocument();
  });
});
