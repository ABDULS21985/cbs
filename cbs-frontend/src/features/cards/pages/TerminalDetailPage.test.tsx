import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { TerminalDetailPage } from './TerminalDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockTerminal = {
  id: 1,
  terminalId: 'TID-001',
  terminalType: 'COUNTERTOP',
  merchantId: 'MCH-ABC',
  merchantName: 'Test Store',
  merchantCategoryCode: '5411',
  locationAddress: '123 Main St',
  supportsContactless: true,
  supportsChip: true,
  supportsMagstripe: false,
  supportsPin: true,
  supportsQr: false,
  maxTransactionAmount: 5000000,
  acquiringBankCode: '058',
  settlementAccountId: 100,
  batchSettlementTime: '23:00',
  lastTransactionAt: null,
  transactionsToday: 42,
  operationalStatus: 'ACTIVE',
  lastHeartbeatAt: new Date().toISOString(),
  softwareVersion: 'v2.4.1',
  createdAt: '2024-06-15T10:00:00Z',
  updatedAt: '2024-06-15T10:00:00Z',
};

const mockTransactions = [
  {
    id: 1,
    switchRef: 'SW-001',
    terminalId: 'TID-001',
    merchantId: 'MCH-ABC',
    amount: 25000,
    currency: 'NGN',
    cardScheme: 'VISA',
    responseCode: '00',
    authCode: 'AUTH01',
    posEntryMode: 'CHIP',
    fraudScore: 10,
    processedAt: '2024-06-15T12:00:00Z',
  },
  {
    id: 2,
    switchRef: 'SW-002',
    terminalId: 'TID-001',
    merchantId: 'MCH-ABC',
    amount: 50000,
    currency: 'NGN',
    cardScheme: 'MASTERCARD',
    responseCode: '51',
    authCode: 'AUTH02',
    posEntryMode: 'CONTACTLESS',
    fraudScore: 80,
    processedAt: '2024-06-15T13:00:00Z',
  },
  {
    id: 3,
    switchRef: 'SW-003',
    terminalId: 'TID-OTHER',
    merchantId: 'MCH-ABC',
    amount: 10000,
    currency: 'NGN',
    cardScheme: 'VERVE',
    responseCode: '00',
    authCode: 'AUTH03',
    posEntryMode: 'MAGSTRIPE',
    fraudScore: 5,
    processedAt: '2024-06-15T14:00:00Z',
  },
];

const ROUTE_PATH = '/cards/pos/:terminalId';

function setupHandlers(options?: {
  terminal?: typeof mockTerminal;
  transactions?: typeof mockTransactions;
  onHeartbeat?: (terminalId: string) => void;
  onStatusChange?: (terminalId: string, body: Record<string, unknown>) => void;
}) {
  const {
    terminal = mockTerminal,
    transactions = mockTransactions,
    onHeartbeat,
    onStatusChange,
  } = options ?? {};

  server.use(
    http.get('/api/v1/pos-terminals/:terminalId', () =>
      HttpResponse.json(wrap(terminal)),
    ),
    http.get('/api/v1/card-switch/merchant/:merchantId', () =>
      HttpResponse.json(wrap(transactions)),
    ),
    http.post('/api/v1/pos-terminals/:terminalId/heartbeat', ({ params }) => {
      onHeartbeat?.(params.terminalId as string);
      return HttpResponse.json(wrap({ ...terminal, lastHeartbeatAt: new Date().toISOString() }));
    }),
    http.post('/api/v1/pos-terminals/:terminalId/status', async ({ params, request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      onStatusChange?.(params.terminalId as string, body);
      return HttpResponse.json(wrap({ ...terminal, operationalStatus: body.status }));
    }),
  );
}

function renderPage(terminal?: typeof mockTerminal) {
  setupHandlers(terminal ? { terminal } : undefined);
  return renderWithProviders(
    <Routes>
      <Route path={ROUTE_PATH} element={<TerminalDetailPage />} />
    </Routes>,
    { route: '/cards/pos/TID-001' },
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('TerminalDetailPage', () => {
  // ── 1. Renders terminal details with stat cards ──────────────────────────────

  it('renders terminal details with stat cards', async () => {
    renderPage();

    await waitFor(() => {
      const tidElements = screen.getAllByText('TID-001');
      expect(tidElements.length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText('Txns Today')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('SW Version')).toBeInTheDocument();
    expect(screen.getByText('Max Txn')).toBeInTheDocument();
  });

  // ── 2. Shows capabilities badges ────────────────────────────────────────────

  it('shows capabilities badges with check for supported and X for unsupported', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
    });

    // Supported capabilities (green badge)
    expect(screen.getByText('Chip')).toBeInTheDocument();
    expect(screen.getByText('Contactless')).toBeInTheDocument();
    expect(screen.getByText('PIN')).toBeInTheDocument();

    // Unsupported capabilities (gray badge)
    expect(screen.getByText('Magstripe')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();

    // Verify green styling for supported capabilities
    const chipBadge = screen.getByText('Chip').closest('span');
    expect(chipBadge?.className).toContain('bg-green-50');

    // Verify gray styling for unsupported capabilities
    const magstripeBadge = screen.getByText('Magstripe').closest('span');
    expect(magstripeBadge?.className).toContain('bg-gray-100');

    const qrBadge = screen.getByText('QR').closest('span');
    expect(qrBadge?.className).toContain('bg-gray-100');
  });

  // ── 3. Shows terminal info grid ─────────────────────────────────────────────

  it('shows terminal info grid with all fields', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Terminal Details')).toBeInTheDocument();
    });

    const expectedLabels = [
      'Terminal ID',
      'Type',
      'Merchant',
      'Merchant ID',
      'Location',
      'MCC',
      'Acquiring Bank',
      'Settlement Account',
      'Batch Settlement',
      'Max Txn Amount',
      'Software Version',
      'Last Heartbeat',
      'Last Transaction',
      'Deployed',
    ];

    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // Verify specific field values (some appear in both stat cards and info grid)
    expect(screen.getAllByText('COUNTERTOP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Test Store').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('MCH-ABC').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('123 Main St').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('5411')).toBeInTheDocument();
    expect(screen.getByText('058')).toBeInTheDocument();
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('23:00')).toBeInTheDocument();
    expect(screen.getAllByText('v2.4.1').length).toBeGreaterThanOrEqual(1);
  });

  // ── 4. Send Heartbeat button calls backend ─────────────────────────────────

  it('sends heartbeat when Send Heartbeat button is clicked', async () => {
    let capturedTerminalId: string | null = null;
    setupHandlers({
      onHeartbeat: (terminalId) => {
        capturedTerminalId = terminalId;
      },
    });

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<TerminalDetailPage />} />
      </Routes>,
      { route: '/cards/pos/TID-001' },
    );

    await waitFor(() => {
      expect(screen.getByText('Send Heartbeat')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Send Heartbeat'));

    await waitFor(() => {
      expect(capturedTerminalId).toBe('TID-001');
    });
  });

  // ── 5. Change Status dropdown opens and shows status options ────────────────

  it('opens Change Status dropdown and shows all status options', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Change Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Status'));

    await waitFor(() => {
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });

    expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
    expect(screen.getByText('TAMPERED')).toBeInTheDocument();
    expect(screen.getByText('DECOMMISSIONED')).toBeInTheDocument();

    // ACTIVE should be present but disabled since it is the current status
    const activeButtons = screen.getAllByText('ACTIVE');
    const activeDropdownButton = activeButtons.find(
      (el) => el.closest('button')?.disabled === true,
    );
    expect(activeDropdownButton).toBeDefined();
  });

  // ── 6. Selecting a status calls the update status API ───────────────────────

  it('calls the update status API when a status option is selected', async () => {
    let capturedTerminalId: string | null = null;
    let capturedBody: Record<string, unknown> | null = null;

    setupHandlers({
      onStatusChange: (terminalId, body) => {
        capturedTerminalId = terminalId;
        capturedBody = body;
      },
    });

    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<TerminalDetailPage />} />
      </Routes>,
      { route: '/cards/pos/TID-001' },
    );

    await waitFor(() => {
      expect(screen.getByText('Change Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Status'));

    await waitFor(() => {
      expect(screen.getByText('SUSPENDED')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SUSPENDED'));

    await waitFor(() => {
      expect(capturedTerminalId).toBe('TID-001');
    });

    expect(capturedBody).toEqual({ status: 'SUSPENDED' });
  });

  // ── 7. Shows loading state initially ────────────────────────────────────────

  it('shows loading state initially', () => {
    setupHandlers();
    renderWithProviders(
      <Routes>
        <Route path={ROUTE_PATH} element={<TerminalDetailPage />} />
      </Routes>,
      { route: '/cards/pos/TID-001' },
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const pulseEl = document.querySelector('.animate-pulse');
    expect(pulseEl).toBeInTheDocument();
  });

  // ── 8. Transaction history table renders ────────────────────────────────────

  it('renders transaction history table with filtered transactions', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });

    // SW-001 and SW-002 belong to TID-001 and should appear
    await waitFor(() => {
      expect(screen.getByText('SW-001')).toBeInTheDocument();
    });
    expect(screen.getByText('SW-002')).toBeInTheDocument();

    // SW-003 belongs to TID-OTHER and should be filtered out
    expect(screen.queryByText('SW-003')).not.toBeInTheDocument();
  });

  // ── 9. Shows online status for recent heartbeat ─────────────────────────────

  it('shows online status for terminal with recent heartbeat', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('online')).toBeInTheDocument();
    });

    // The ONLINE text in stat card should also appear as uppercase
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
  });

  // ── Additional edge cases ───────────────────────────────────────────────────

  it('shows offline status for terminal with no heartbeat', async () => {
    renderPage({
      ...mockTerminal,
      lastHeartbeatAt: null as unknown as string,
    });

    await waitFor(() => {
      expect(screen.getByText('offline')).toBeInTheDocument();
    });

    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('shows idle status for terminal with old heartbeat', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    renderPage({
      ...mockTerminal,
      lastHeartbeatAt: tenMinutesAgo,
    });

    await waitFor(() => {
      expect(screen.getByText('idle')).toBeInTheDocument();
    });

    expect(screen.getByText('IDLE')).toBeInTheDocument();
  });

  it('renders page header subtitle with merchant name, type, and location', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Test Store — COUNTERTOP — 123 Main St'),
      ).toBeInTheDocument();
    });
  });

  it('shows "Never" for Last Transaction when lastTransactionAt is null', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Terminal Details')).toBeInTheDocument();
    });

    // There should be "Never" for Last Transaction (and potentially for Last Heartbeat
    // if it were null, but in the default mock it has a recent heartbeat)
    const neverElements = screen.getAllByText('Never');
    expect(neverElements.length).toBeGreaterThanOrEqual(1);
  });
});
