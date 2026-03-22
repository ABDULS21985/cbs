import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { MerchantDetailPage } from './MerchantDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockMerchant = {
  id: 1,
  merchantId: 'MCH-ABC123',
  merchantName: 'Test Store',
  merchantCategoryCode: '5411',
  businessType: 'LLC',
  mdrRate: 1.5,
  riskCategory: 'LOW',
  chargebackRate: 0.3,
  status: 'ACTIVE',
  terminalCount: 3,
  monthlyVolumeLimit: 5000000,
  settlementFrequency: 'DAILY',
  contactName: 'John',
  contactEmail: 'john@test.com',
  contactPhone: '+234801234',
  settlementAccountId: 100,
  onboardedAt: '2024-06-15T10:00:00Z',
  createdAt: '2024-06-15T10:00:00Z',
  updatedAt: '2024-06-15T10:00:00Z',
};

const mockTransactions = [
  {
    id: 1, switchRef: 'SW-001', amount: 25000, currency: 'NGN',
    cardScheme: 'VISA', responseCode: '00', authCode: 'A001',
    posEntryMode: 'CHIP', fraudScore: 12, processedAt: '2024-06-20T14:00:00Z',
    merchantId: 1, terminalId: 'T-001',
  },
  {
    id: 2, switchRef: 'SW-002', amount: 75000, currency: 'NGN',
    cardScheme: 'MASTERCARD', responseCode: '05', authCode: '',
    posEntryMode: 'CONTACTLESS', fraudScore: 85, processedAt: '2024-06-21T10:00:00Z',
    merchantId: 1, terminalId: 'T-002',
  },
];

const mockTerminals = [
  {
    id: 1, terminalId: 'TRM-001', terminalType: 'POS',
    merchantId: 'MCH-ABC123', merchantName: 'Test Store',
    locationAddress: '123 Main St, Lagos', operationalStatus: 'ONLINE',
    lastHeartbeatAt: '2024-06-21T12:00:00Z', transactionsToday: 42,
    supportsChip: true, supportsContactless: true, supportsPin: true, supportsQr: false,
  },
  {
    id: 2, terminalId: 'TRM-002', terminalType: 'MPOS',
    merchantId: 'MCH-ABC123', merchantName: 'Test Store',
    locationAddress: '456 Market Rd, Abuja', operationalStatus: 'OFFLINE',
    lastHeartbeatAt: null, transactionsToday: 0,
    supportsChip: true, supportsContactless: false, supportsPin: true, supportsQr: true,
  },
];

const mockDisputes = [
  {
    id: 10, disputeRef: 'DSP-100', merchantId: 'MCH-ABC123',
    disputeReason: 'Unauthorized charge', disputeAmount: 15000,
    disputeCurrency: 'NGN', status: 'OPEN', createdAt: '2024-06-20T08:00:00Z',
  },
];

const ROUTE_PATH = '/cards/merchants/:merchantId';

function setupHandlers(merchantOverride?: Partial<typeof mockMerchant>) {
  const merchant = { ...mockMerchant, ...merchantOverride };
  server.use(
    http.get('/api/v1/merchants/:merchantId', () => HttpResponse.json(wrap(merchant))),
    http.get('/api/v1/card-switch/merchant/:merchantId', () => HttpResponse.json(wrap(mockTransactions))),
    http.get('/api/v1/pos-terminals/merchant/:merchantId', () => HttpResponse.json(wrap(mockTerminals))),
    http.get('/api/v1/cards/disputes/status/:status', () => HttpResponse.json(wrap(mockDisputes))),
  );
}

function renderPage(merchantOverride?: Partial<typeof mockMerchant>) {
  setupHandlers(merchantOverride);
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<MerchantDetailPage />} />
      {/* Catch routes for navigation assertions */}
      <Route path="/cards/pos" element={<div>POS Page</div>} />
      <Route path="/cards/pos/:terminalId" element={<div>Terminal Detail</div>} />
    </Routes>,
    { route: '/cards/merchants/MCH-ABC123' },
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('MerchantDetailPage', () => {
  // ── 1. Renders merchant details after loading ──────────────────────────────

  it('renders merchant name, status badge, and risk category after loading', async () => {
    renderPage();

    await waitFor(() => {
      // "Test Store" appears in header h1 and info grid Name field
      const nameEls = screen.getAllByText('Test Store');
      expect(nameEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // MCH-ABC123 appears in header subtitle and info grid Merchant ID field
    const midEls = screen.getAllByText('MCH-ABC123');
    expect(midEls.length).toBeGreaterThanOrEqual(1);
    // Status badge
    const activeEls = screen.getAllByText('ACTIVE');
    expect(activeEls.length).toBeGreaterThanOrEqual(1);
    // Risk category label in header
    expect(screen.getByText(/LOW RISK/)).toBeInTheDocument();
  });

  // ── 2. Shows stat cards with calculated values ─────────────────────────────

  it('renders all five stat cards', async () => {
    renderPage();

    await waitFor(() => {
      // "Monthly Volume Limit" appears in both stat card and info grid
      const mvlEls = screen.getAllByText('Monthly Volume Limit');
      expect(mvlEls.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // "Terminals" appears as stat card label and as tab label
    const terminalEls = screen.getAllByText('Terminals');
    expect(terminalEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Ticket')).toBeInTheDocument();
    expect(screen.getByText('Chargeback %')).toBeInTheDocument();
    expect(screen.getByText('Approval Rate')).toBeInTheDocument();
  });

  // ── 3. Shows business details info grid ────────────────────────────────────

  it('renders the Business Details info grid with field values', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Details')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check info grid labels and values
    expect(screen.getByText('Merchant ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('MCC')).toBeInTheDocument();
    expect(screen.getByText('5411')).toBeInTheDocument();
    expect(screen.getByText('MDR Rate')).toBeInTheDocument();
    expect(screen.getByText('Risk Category')).toBeInTheDocument();
    expect(screen.getByText('Settlement')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('+234801234')).toBeInTheDocument();
    expect(screen.getByText('Settlement Account')).toBeInTheDocument();
  });

  // ── 4. Suspend button opens dialog for ACTIVE merchant ─────────────────────

  it('shows Suspend button and opens dialog with reason field for ACTIVE merchant', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Suspend')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Suspend'));

    await waitFor(() => {
      expect(screen.getByText('Suspend Merchant?')).toBeInTheDocument();
    });

    // Dialog shows merchant info and reason textarea
    expect(screen.getByPlaceholderText('Provide the reason for suspension...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    // Character counter
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  // ── 5. Suspend dialog calls backend with reason on confirm ─────────────────

  it('calls POST /merchants/:id/suspend with reason when confirming suspension', async () => {
    let capturedMerchantId: string | undefined;
    let capturedBody: Record<string, unknown> | undefined;

    server.use(
      http.get('/api/v1/merchants/:merchantId', () => HttpResponse.json(wrap(mockMerchant))),
      http.get('/api/v1/card-switch/merchant/:merchantId', () => HttpResponse.json(wrap(mockTransactions))),
      http.get('/api/v1/pos-terminals/merchant/:merchantId', () => HttpResponse.json(wrap(mockTerminals))),
      http.get('/api/v1/cards/disputes/status/:status', () => HttpResponse.json(wrap(mockDisputes))),
      http.post('/api/v1/merchants/:merchantId/suspend', async ({ params, request }) => {
        capturedMerchantId = params.merchantId as string;
        capturedBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json(wrap({ ...mockMerchant, status: 'SUSPENDED' }));
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<MerchantDetailPage />} />
      </Routes>,
      { route: '/cards/merchants/MCH-ABC123' },
    );

    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Suspend')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.click(screen.getByText('Suspend'));

    await waitFor(() => {
      expect(screen.getByText('Suspend Merchant?')).toBeInTheDocument();
    });

    // Fill reason
    const textarea = screen.getByPlaceholderText('Provide the reason for suspension...');
    await user.type(textarea, 'Fraudulent activity detected');

    // Find the dialog's red confirm button (bg-red-600) which is distinct from the action bar button
    const dialogConfirmBtn = document.querySelector('button.bg-red-600') as HTMLButtonElement;
    expect(dialogConfirmBtn).toBeTruthy();
    await user.click(dialogConfirmBtn);

    await waitFor(() => {
      expect(capturedMerchantId).toBe('MCH-ABC123');
    }, { timeout: 3000 });

    expect(capturedBody).toEqual({ reason: 'Fraudulent activity detected' });
  });

  // ── 6. Reactivate button calls backend for SUSPENDED merchant ──────────────

  it('shows Reactivate button for SUSPENDED merchant and calls activate endpoint', async () => {
    let activateCalled = false;
    let capturedMerchantId: string | undefined;

    renderPage({ status: 'SUSPENDED' });

    server.use(
      http.post('/api/v1/merchants/:merchantId/activate', ({ params }) => {
        activateCalled = true;
        capturedMerchantId = params.merchantId as string;
        return HttpResponse.json(wrap({ ...mockMerchant, status: 'ACTIVE' }));
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Reactivate')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should not show Suspend button for SUSPENDED merchant
    expect(screen.queryByRole('button', { name: /^Suspend$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Reactivate'));

    await waitFor(() => {
      expect(activateCalled).toBe(true);
    }, { timeout: 3000 });

    expect(capturedMerchantId).toBe('MCH-ABC123');
  });

  // ── 7. Activate button appears for PENDING merchant ────────────────────────

  it('shows Activate button for PENDING merchant and calls activate endpoint', async () => {
    let activateCalled = false;

    renderPage({ status: 'PENDING' });

    server.use(
      http.post('/api/v1/merchants/:merchantId/activate', () => {
        activateCalled = true;
        return HttpResponse.json(wrap({ ...mockMerchant, status: 'ACTIVE' }));
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should not show Suspend or Reactivate
    expect(screen.queryByRole('button', { name: /^Suspend$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Reactivate')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Activate'));

    await waitFor(() => {
      expect(activateCalled).toBe(true);
    }, { timeout: 3000 });
  });

  // ── 8. Shows "Merchant Not Found" for invalid merchantId ───────────────────

  it('shows Merchant Not Found when merchant API returns no data', async () => {
    server.use(
      http.get('/api/v1/merchants/:merchantId', () =>
        HttpResponse.json(wrap(null)),
      ),
      http.get('/api/v1/card-switch/merchant/:merchantId', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/pos-terminals/merchant/:merchantId', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cards/disputes/status/:status', () => HttpResponse.json(wrap([]))),
    );

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<MerchantDetailPage />} />
      </Routes>,
      { route: '/cards/merchants/MCH-INVALID' },
    );

    await waitFor(() => {
      expect(screen.getByText('Merchant Not Found')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/No merchant found with ID/)).toBeInTheDocument();
  });

  // ── 9. Terminals tab shows terminal data with clickable rows ───────────────

  it('renders terminal data in the Terminals tab', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('TRM-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('TRM-002')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Lagos')).toBeInTheDocument();
    expect(screen.getByText('456 Market Rd, Abuja')).toBeInTheDocument();
  });

  it('navigates to terminal detail page when terminal row is clicked', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('TRM-001')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click terminal row
    fireEvent.click(screen.getByText('TRM-001'));

    await waitFor(() => {
      expect(screen.getByText('Terminal Detail')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ── 10. Deploy Terminal button navigates to POS page ───────────────────────

  it('navigates to POS page when Deploy Terminal button is clicked', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Deploy Terminal')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Deploy Terminal'));

    await waitFor(() => {
      expect(screen.getByText('POS Page')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
