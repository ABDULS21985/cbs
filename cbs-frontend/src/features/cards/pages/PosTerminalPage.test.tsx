import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { PosTerminalPage } from './PosTerminalPage';

// ─── Navigation mock ──────────────────────────────────────────────────────────

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// ─── Sonner toast mock ─────────────────────────────────────────────────────────

const toastSuccessMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/**
 * Terminal IDs and merchant names appear in both the DataTable and the
 * TerminalHealthMonitor tooltip, so we use getAllByText throughout.
 * This helper waits for the table to render by checking that at least one
 * instance of a known terminal's data appears.
 */
async function waitForTable() {
  await waitFor(() => {
    expect(screen.getAllByText('Alpha Supermarket').length).toBeGreaterThanOrEqual(1);
  });
}

/** Get the DataTable's <table> element for scoped queries. */
function getTable() {
  return document.querySelector('table')!;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const mockTerminals = [
  {
    id: 1,
    terminalId: 'TID-001',
    terminalType: 'COUNTERTOP',
    merchantId: 'MER-001',
    merchantName: 'Alpha Supermarket',
    merchantCategoryCode: '5411',
    locationAddress: '12 Marina Road, Lagos',
    supportsContactless: true,
    supportsChip: true,
    supportsMagstripe: true,
    supportsPin: true,
    supportsQr: false,
    maxTransactionAmount: 5000000,
    acquiringBankCode: '058',
    settlementAccountId: 100,
    batchSettlementTime: '23:00',
    lastTransactionAt: minutesAgo(2),
    transactionsToday: 45,
    operationalStatus: 'ACTIVE',
    lastHeartbeatAt: minutesAgo(2), // online (<5 min)
    softwareVersion: 'v2.4.1',
    createdAt: '2025-06-15T10:00:00Z',
    updatedAt: '2026-03-22T08:00:00Z',
  },
  {
    id: 2,
    terminalId: 'TID-002',
    terminalType: 'MOBILE',
    merchantId: 'MER-002',
    merchantName: 'Beta Electronics',
    merchantCategoryCode: '5732',
    locationAddress: '5 Broad Street, Abuja',
    supportsContactless: true,
    supportsChip: true,
    supportsMagstripe: false,
    supportsPin: true,
    supportsQr: true,
    maxTransactionAmount: 10000000,
    acquiringBankCode: '011',
    settlementAccountId: 200,
    batchSettlementTime: '22:00',
    lastTransactionAt: minutesAgo(12),
    transactionsToday: 20,
    operationalStatus: 'ACTIVE',
    lastHeartbeatAt: minutesAgo(10), // idle (5-30 min)
    softwareVersion: 'v2.3.0',
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2026-03-20T14:00:00Z',
  },
  {
    id: 3,
    terminalId: 'TID-003',
    terminalType: 'SMART',
    merchantId: 'MER-003',
    merchantName: 'Gamma Pharmacy',
    merchantCategoryCode: '5912',
    locationAddress: '88 Allen Avenue, Ikeja',
    supportsContactless: false,
    supportsChip: true,
    supportsMagstripe: true,
    supportsPin: true,
    supportsQr: false,
    maxTransactionAmount: 2000000,
    acquiringBankCode: '033',
    settlementAccountId: 300,
    batchSettlementTime: '23:30',
    lastTransactionAt: minutesAgo(120),
    transactionsToday: 5,
    operationalStatus: 'INACTIVE',
    lastHeartbeatAt: minutesAgo(60), // offline (>30 min)
    softwareVersion: 'v2.1.0',
    createdAt: '2025-03-10T12:00:00Z',
    updatedAt: '2026-03-19T09:00:00Z',
  },
];

function setupHandlers(options?: { terminals?: typeof mockTerminals; onDeploy?: (body: unknown) => void }) {
  const { terminals = mockTerminals, onDeploy } = options ?? {};

  server.use(
    http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap(terminals))),
    http.post('/api/v1/pos-terminals', async ({ request }) => {
      const body = await request.json();
      onDeploy?.(body);
      return HttpResponse.json(
        wrap({
          id: 99,
          ...(body as Record<string, unknown>),
          merchantCategoryCode: '',
          settlementAccountId: 0,
          batchSettlementTime: '23:00',
          lastTransactionAt: null,
          transactionsToday: 0,
          operationalStatus: 'ACTIVE',
          lastHeartbeatAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        { status: 201 },
      );
    }),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PosTerminalPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    toastSuccessMock.mockClear();
  });

  // 1. Renders terminal list with stat cards
  it('renders terminal list with stat cards', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    // Stat card labels — "Online" / "Offline" also appear in the health
    // monitor legend and the filter dropdown, so use getAllByText.
    expect(screen.getByText('Total Terminals')).toBeInTheDocument();
    expect(screen.getAllByText('Online').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Idle (>30min)')).toBeInTheDocument();
    expect(screen.getAllByText('Offline').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Daily Txns')).toBeInTheDocument();

    // All three merchants are rendered (in both table and health monitor)
    const table = getTable();
    expect(within(table).getByText('Alpha Supermarket')).toBeInTheDocument();
    expect(within(table).getByText('Beta Electronics')).toBeInTheDocument();
    expect(within(table).getByText('Gamma Pharmacy')).toBeInTheDocument();
  });

  // 2. Shows correct online/idle/offline counts based on heartbeat
  it('shows correct online/idle/offline counts based on heartbeat', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();

    // TID-001: heartbeat 2 min ago -> ONLINE
    // TID-002: heartbeat 10 min ago -> IDLE
    // TID-003: heartbeat 60 min ago -> OFFLINE
    expect(within(table).getByText('ONLINE')).toBeInTheDocument();
    expect(within(table).getByText('IDLE')).toBeInTheDocument();
    expect(within(table).getByText('OFFLINE')).toBeInTheDocument();
  });

  // 3. Shows empty state with no terminals
  it('shows empty state with no terminals', async () => {
    setupHandlers({ terminals: [] });
    renderWithProviders(<PosTerminalPage />);

    await waitFor(() => {
      expect(screen.getByText('No terminals match your filters')).toBeInTheDocument();
    });

    // Terminal health monitor shows empty state
    expect(screen.getByText('No terminals to monitor')).toBeInTheDocument();
  });

  // 4. Status filter works
  it('filters terminals by status', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();

    // All 3 merchants visible initially
    expect(within(table).getByText('Beta Electronics')).toBeInTheDocument();
    expect(within(table).getByText('Gamma Pharmacy')).toBeInTheDocument();

    // The status filter is the first select in the filter bar
    const selects = document.querySelectorAll('select');
    const statusSelect = selects[0] as HTMLSelectElement;
    await user.selectOptions(statusSelect, 'online');

    // Only the online terminal (Alpha Supermarket) should remain in the table
    expect(within(table).getByText('Alpha Supermarket')).toBeInTheDocument();
    expect(within(table).queryByText('Beta Electronics')).not.toBeInTheDocument();
    expect(within(table).queryByText('Gamma Pharmacy')).not.toBeInTheDocument();
  });

  // 5. Merchant search filter works
  it('filters terminals by merchant name search', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();
    const merchantInput = screen.getByPlaceholderText('Search merchant...');
    await user.type(merchantInput, 'Beta');

    // Only Beta Electronics terminal should show in the table
    expect(within(table).getByText('Beta Electronics')).toBeInTheDocument();
    expect(within(table).queryByText('Alpha Supermarket')).not.toBeInTheDocument();
    expect(within(table).queryByText('Gamma Pharmacy')).not.toBeInTheDocument();
  });

  // 6. Type filter works
  it('filters terminals by type', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();

    // The Type filter is the second select in the filter bar
    const selects = document.querySelectorAll('select');
    const typeSelect = selects[1] as HTMLSelectElement;
    await user.selectOptions(typeSelect, 'MOBILE');

    // Only the MOBILE terminal (Beta Electronics) should remain
    expect(within(table).getByText('Beta Electronics')).toBeInTheDocument();
    expect(within(table).queryByText('Alpha Supermarket')).not.toBeInTheDocument();
    expect(within(table).queryByText('Gamma Pharmacy')).not.toBeInTheDocument();
  });

  // 7. Deploy Terminal button opens modal
  it('opens deploy terminal modal on button click', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    // The "Deploy Terminal" button is in the page header
    const deployButtons = screen.getAllByText('Deploy Terminal');
    await user.click(deployButtons[0]);

    await waitFor(() => {
      // Modal heading (h2)
      const headings = screen.getAllByText('Deploy Terminal');
      const h2 = headings.find((el) => el.tagName === 'H2');
      expect(h2).toBeTruthy();
    });

    // Verify modal form fields are present via placeholders
    expect(screen.getByPlaceholderText('TID-001')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MER-001')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Merchant name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 058')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., v2.4.1')).toBeInTheDocument();

    // Capability checkboxes
    expect(screen.getByLabelText('Contactless')).toBeInTheDocument();
    expect(screen.getByLabelText('Chip')).toBeInTheDocument();
    expect(screen.getByLabelText('Magstripe')).toBeInTheDocument();
    expect(screen.getByLabelText('Pin')).toBeInTheDocument();
    expect(screen.getByLabelText('Qr')).toBeInTheDocument();
  });

  // 8. Deploy modal submits correct payload
  it('submits correct payload when deploying a terminal', async () => {
    let capturedPayload: unknown = null;
    setupHandlers({
      onDeploy: (body) => {
        capturedPayload = body;
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    // Open deploy modal
    const deployButtons = screen.getAllByText('Deploy Terminal');
    await user.click(deployButtons[0]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('TID-001')).toBeInTheDocument();
    });

    // Fill out the form
    await user.type(screen.getByPlaceholderText('TID-001'), 'TID-NEW-100');

    // Select terminal type — the modal's select is inside the modal overlay (fixed inset-0)
    const modalOverlay = document.querySelector('.fixed.inset-0')!;
    const modalSelects = modalOverlay.querySelectorAll('select');
    await user.selectOptions(modalSelects[0] as HTMLSelectElement, 'SMART');

    await user.type(screen.getByPlaceholderText('MER-001'), 'MER-NEW-100');
    await user.type(screen.getByPlaceholderText('Merchant name'), 'New Merchant Shop');
    await user.type(screen.getByPlaceholderText('Address'), '99 Test Avenue, Lagos');
    await user.type(screen.getByPlaceholderText('e.g., 058'), '044');
    await user.type(screen.getByPlaceholderText('e.g., v2.4.1'), 'v3.0.0');

    // Uncheck Contactless (default is true)
    await user.click(screen.getByLabelText('Contactless'));

    // Submit the form
    const allDeployButtons = screen.getAllByText('Deploy Terminal');
    const submitButton = allDeployButtons.find(
      (el) => el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit',
    );
    expect(submitButton).toBeTruthy();
    await user.click(submitButton!);

    await waitFor(() => {
      expect(capturedPayload).not.toBeNull();
    });

    expect(capturedPayload).toEqual(
      expect.objectContaining({
        terminalId: 'TID-NEW-100',
        terminalType: 'SMART',
        merchantId: 'MER-NEW-100',
        merchantName: 'New Merchant Shop',
        locationAddress: '99 Test Avenue, Lagos',
        acquiringBankCode: '044',
        softwareVersion: 'v3.0.0',
        supportsContactless: false,
        supportsChip: true,
        supportsMagstripe: true,
        supportsPin: true,
        supportsQr: false,
      }),
    );
  });

  // 9. Deploy modal closes and refreshes list on success
  it('closes deploy modal and shows toast on success', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    // Wait for initial data
    await waitForTable();

    // Open deploy modal
    const deployButtons = screen.getAllByText('Deploy Terminal');
    await user.click(deployButtons[0]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('TID-001')).toBeInTheDocument();
    });

    // Fill required fields
    await user.type(screen.getByPlaceholderText('TID-001'), 'TID-NEW');
    await user.type(screen.getByPlaceholderText('MER-001'), 'MER-NEW');
    await user.type(screen.getByPlaceholderText('Merchant name'), 'New Shop');
    await user.type(screen.getByPlaceholderText('Address'), '1 Test St');
    await user.type(screen.getByPlaceholderText('e.g., 058'), '058');

    // Submit
    const allDeployButtons = screen.getAllByText('Deploy Terminal');
    const submitButton = allDeployButtons.find(
      (el) => el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit',
    );
    await user.click(submitButton!);

    // Modal should close (the fixed overlay disappears)
    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
    });

    // Toast success should have been called
    expect(toastSuccessMock).toHaveBeenCalledWith('Terminal deployed');
  });

  // 10. Row click navigates to terminal detail
  it('navigates to terminal detail page on row click', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    // Click on a row by clicking the merchant name inside the table
    const table = getTable();
    await user.click(within(table).getByText('Beta Electronics'));

    expect(navigateMock).toHaveBeenCalledWith('/cards/pos/TID-002');
  });

  // ─── Additional coverage ───────────────────────────────────────────────────

  it('renders page header with title and subtitle', () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);
    expect(screen.getByText('POS Terminals')).toBeInTheDocument();
    expect(screen.getByText('Terminal deployment, health monitoring, and management')).toBeInTheDocument();
  });

  it('displays terminal types in the table', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();
    expect(within(table).getByText('COUNTERTOP')).toBeInTheDocument();
    expect(within(table).getByText('MOBILE')).toBeInTheDocument();
    expect(within(table).getByText('SMART')).toBeInTheDocument();
  });

  it('displays location addresses in the table', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();
    expect(within(table).getByText('12 Marina Road, Lagos')).toBeInTheDocument();
    expect(within(table).getByText('5 Broad Street, Abuja')).toBeInTheDocument();
    expect(within(table).getByText('88 Allen Avenue, Ikeja')).toBeInTheDocument();
  });

  it('displays software versions in the table', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();
    expect(within(table).getByText('v2.4.1')).toBeInTheDocument();
    expect(within(table).getByText('v2.3.0')).toBeInTheDocument();
    expect(within(table).getByText('v2.1.0')).toBeInTheDocument();
  });

  it('displays transactions today for each terminal', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();
    expect(within(table).getByText('45')).toBeInTheDocument();
    expect(within(table).getByText('20')).toBeInTheDocument();
  });

  it('closes deploy modal when cancel button is clicked', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    const deployButtons = screen.getAllByText('Deploy Terminal');
    await user.click(deployButtons[0]);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('TID-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('TID-001')).not.toBeInTheDocument();
    });
  });

  it('merchant search is case-insensitive', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    const table = getTable();
    const merchantInput = screen.getByPlaceholderText('Search merchant...');
    await user.type(merchantInput, 'alpha');

    expect(within(table).getByText('Alpha Supermarket')).toBeInTheDocument();
    expect(within(table).queryByText('Beta Electronics')).not.toBeInTheDocument();
    expect(within(table).queryByText('Gamma Pharmacy')).not.toBeInTheDocument();
  });

  it('combines status and type filters together', async () => {
    // Add a second COUNTERTOP terminal that is offline
    const terminals = [
      ...mockTerminals,
      {
        ...mockTerminals[0],
        id: 4,
        terminalId: 'TID-004',
        merchantName: 'Delta Market',
        lastHeartbeatAt: minutesAgo(60), // offline
        transactionsToday: 10,
      },
    ];
    setupHandlers({ terminals });
    const user = userEvent.setup();
    renderWithProviders(<PosTerminalPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Delta Market').length).toBeGreaterThanOrEqual(1);
    });

    const table = getTable();

    // Filter by offline status
    const selects = document.querySelectorAll('select');
    const statusSelect = selects[0] as HTMLSelectElement;
    await user.selectOptions(statusSelect, 'offline');

    // Both TID-003 (SMART, offline) and TID-004 (COUNTERTOP, offline) should show
    expect(within(table).getByText('Gamma Pharmacy')).toBeInTheDocument();
    expect(within(table).getByText('Delta Market')).toBeInTheDocument();
    expect(within(table).queryByText('Alpha Supermarket')).not.toBeInTheDocument();

    // Now also filter by COUNTERTOP type
    const typeSelect = selects[1] as HTMLSelectElement;
    await user.selectOptions(typeSelect, 'COUNTERTOP');

    // Only Delta Market should remain (COUNTERTOP + offline)
    expect(within(table).getByText('Delta Market')).toBeInTheDocument();
    expect(within(table).queryByText('Gamma Pharmacy')).not.toBeInTheDocument();
  });

  it('renders Terminal Health Grid section', async () => {
    setupHandlers();
    renderWithProviders(<PosTerminalPage />);

    await waitForTable();

    expect(screen.getByText('Terminal Health Grid')).toBeInTheDocument();
  });
});
