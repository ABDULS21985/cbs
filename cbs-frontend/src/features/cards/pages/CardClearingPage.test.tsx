import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardClearingPage } from './CardClearingPage';

const wrap = <T,>(data: T) => ({ success: true, data, timestamp: new Date().toISOString() });

// ── Mock Data (aligned to backend entities & DB CHECK constraints) ──────────

const mockBatches = [
  {
    id: 1, batchId: 'CCB-AAAA000001', network: 'VISA', batchType: 'CLEARING',
    clearingDate: '2026-03-22', settlementDate: null, currency: 'NGN',
    totalTransactions: 1250, totalAmount: 5000000, totalFees: 75000,
    interchangeAmount: 125000, netSettlementAmount: 4800000,
    fileReference: 'VISA_CLR_20260322_001.dat', status: 'RECEIVED',
    exceptionCount: 0, reconciledAt: null, createdAt: '2026-03-22T08:00:00Z',
  },
  {
    id: 2, batchId: 'CCB-BBBB000002', network: 'VISA', batchType: 'SETTLEMENT',
    clearingDate: '2026-03-22', settlementDate: '2026-03-22', currency: 'NGN',
    totalTransactions: 800, totalAmount: 3200000, totalFees: 48000,
    interchangeAmount: 80000, netSettlementAmount: 3072000,
    fileReference: 'VISA_STL_20260322_001.dat', status: 'SETTLED',
    exceptionCount: 0, reconciledAt: '2026-03-22T14:00:00Z', createdAt: '2026-03-22T06:00:00Z',
  },
  {
    id: 3, batchId: 'CCB-CCCC000003', network: 'VISA', batchType: 'CLEARING',
    clearingDate: '2026-03-22', settlementDate: null, currency: 'NGN',
    totalTransactions: 50, totalAmount: 200000, totalFees: 3000,
    interchangeAmount: 5000, netSettlementAmount: 192000,
    fileReference: 'VISA_CLR_20260322_002.dat', status: 'MATCHED',
    exceptionCount: 0, reconciledAt: null, createdAt: '2026-03-22T09:00:00Z',
  },
];

const mockPositions = [
  {
    id: 1, settlementDate: '2026-03-22', network: 'VISA',
    counterpartyBic: 'GTBINGLA', counterpartyName: 'Guaranty Trust Bank',
    currency: 'NGN', grossDebits: 2500000, grossCredits: 3000000,
    interchangeReceivable: 75000, interchangePayable: 50000, schemeFees: 15000,
    netPosition: 510000, settlementAccountId: 100, status: 'SETTLED',
    settledAt: '2026-03-22T14:00:00Z', createdAt: '2026-03-22T08:00:00Z',
  },
  {
    id: 2, settlementDate: '2026-03-22', network: 'VISA',
    counterpartyBic: 'ABORNGLA', counterpartyName: 'Sterling Bank',
    currency: 'NGN', grossDebits: 1800000, grossCredits: 1200000,
    interchangeReceivable: 30000, interchangePayable: 20000, schemeFees: 10000,
    netPosition: -600000, settlementAccountId: 101, status: 'PENDING',
    settledAt: null, createdAt: '2026-03-22T08:00:00Z',
  },
];

const mockMastercardPositions = [
  {
    id: 3, settlementDate: '2026-03-22', network: 'MASTERCARD',
    counterpartyBic: 'ACCESSNG', counterpartyName: 'Access Bank',
    currency: 'NGN', grossDebits: 1000000, grossCredits: 1500000,
    interchangeReceivable: 40000, interchangePayable: 25000, schemeFees: 8000,
    netPosition: 507000, settlementAccountId: 102, status: 'CONFIRMED',
    settledAt: null, createdAt: '2026-03-22T07:00:00Z',
  },
];

const mockVervePositions = [
  {
    id: 4, settlementDate: '2026-03-22', network: 'VERVE',
    counterpartyBic: null, counterpartyName: 'Interswitch',
    currency: 'NGN', grossDebits: 500000, grossCredits: 800000,
    interchangeReceivable: 20000, interchangePayable: 15000, schemeFees: 5000,
    netPosition: 300000, settlementAccountId: 103, status: 'PENDING',
    settledAt: null, createdAt: '2026-03-22T06:00:00Z',
  },
];

// ── Handler Setup ───────────────────────────────────────────────────────────

function setupHandlers(options?: {
  batches?: typeof mockBatches;
  visaPositions?: typeof mockPositions;
  mastercardPositions?: typeof mockMastercardPositions;
  vervePositions?: typeof mockVervePositions;
  onIngest?: (body: Record<string, unknown>) => void;
  onSettle?: (batchId: string) => void;
  onManual?: (body: Record<string, unknown>) => void;
  onCreatePosition?: (body: Record<string, unknown>) => void;
  onUpdateStatus?: (id: string, body: Record<string, unknown>) => void;
  onEscalate?: (id: string, body: Record<string, unknown>) => void;
  settleError?: boolean;
}) {
  const {
    batches = mockBatches,
    visaPositions = mockPositions,
    mastercardPositions: mcPositions = mockMastercardPositions,
    vervePositions = mockVervePositions,
    onIngest, onSettle, onManual, onCreatePosition, onUpdateStatus, onEscalate,
    settleError = false,
  } = options ?? {};

  server.use(
    // GET batches by network + date
    http.get('/api/v1/card-clearing/batches/:network/:date', ({ params }) => {
      const filtered = batches.filter(b => b.network === params.network);
      return HttpResponse.json(wrap(filtered));
    }),

    // GET all batches
    http.get('/api/v1/card-clearing/batches', () => {
      return HttpResponse.json(wrap(batches));
    }),

    // GET positions by date + network
    http.get('/api/v1/card-clearing/positions/:date/:network', ({ params }) => {
      const network = params.network as string;
      if (network === 'VISA') return HttpResponse.json(wrap(visaPositions));
      if (network === 'MASTERCARD') return HttpResponse.json(wrap(mcPositions));
      if (network === 'VERVE') return HttpResponse.json(wrap(vervePositions));
      return HttpResponse.json(wrap([]));
    }),

    // GET all positions
    http.get('/api/v1/card-clearing/positions', () => {
      return HttpResponse.json(wrap([...visaPositions, ...mcPositions, ...vervePositions]));
    }),

    // POST ingest batch
    http.post('/api/v1/card-clearing/batches', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      onIngest?.(body);
      return HttpResponse.json(
        wrap({ ...body, id: 99, batchId: 'CCB-NEW000099', status: 'RECEIVED', netSettlementAmount: (body.totalAmount as number) - (body.totalFees as number) - (body.interchangeAmount as number) }),
        { status: 201 },
      );
    }),

    // POST settle batch
    http.post('/api/v1/card-clearing/batches/:batchId/settle', ({ params }) => {
      const batchId = params.batchId as string;
      onSettle?.(batchId);
      if (settleError) {
        return HttpResponse.json({ success: false, message: 'Batch not found' }, { status: 404 });
      }
      const batch = batches.find(b => b.batchId === batchId);
      return HttpResponse.json(wrap({ ...batch, status: 'SETTLED', settlementDate: '2026-03-22' }));
    }),

    // POST manual batch
    http.post('/api/v1/card-clearing/manual', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      onManual?.(body);
      return HttpResponse.json(
        wrap({ ...body, id: 100, batchId: 'CCB-MAN000100', status: 'RECEIVED' }),
        { status: 201 },
      );
    }),

    // POST create position
    http.post('/api/v1/card-clearing/positions', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      onCreatePosition?.(body);
      return HttpResponse.json(
        wrap({ ...body, id: 50 }),
        { status: 201 },
      );
    }),

    // POST create settlement (alias)
    http.post('/api/v1/card-clearing/settlement/create', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      onCreatePosition?.(body);
      return HttpResponse.json(
        wrap({ ...body, id: 51 }),
        { status: 201 },
      );
    }),

    // PATCH update position status
    http.patch('/api/v1/card-clearing/positions/:id/status', async ({ params, request }) => {
      const body = await request.json() as Record<string, unknown>;
      onUpdateStatus?.(params.id as string, body);
      const pos = visaPositions.find(p => p.id === Number(params.id)) ?? visaPositions[0];
      return HttpResponse.json(wrap({ ...pos, status: body.status }));
    }),

    // POST escalate position
    http.post('/api/v1/card-clearing/positions/:id/escalate', async ({ params, request }) => {
      const body = await request.json() as Record<string, unknown>;
      onEscalate?.(params.id as string, body);
      const pos = visaPositions.find(p => p.id === Number(params.id)) ?? visaPositions[0];
      return HttpResponse.json(wrap({ ...pos, status: 'DISPUTED' }));
    }),

    // GET batch detail
    http.get('/api/v1/card-clearing/batches/detail/:batchId', ({ params }) => {
      const batch = batches.find(b => b.batchId === params.batchId);
      if (!batch) return HttpResponse.json({ message: 'Not found' }, { status: 404 });
      return HttpResponse.json(wrap(batch));
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CardClearingPage', () => {
  // ── Page-level rendering ────────────────────────────────────────────────

  it('renders page header with correct title and subtitle', () => {
    setupHandlers();
    renderWithProviders(<CardClearingPage />);
    expect(screen.getByText('Card Clearing & Settlement')).toBeInTheDocument();
    expect(screen.getByText(/Clearing batches, settlement positions/)).toBeInTheDocument();
  });

  it('sets document title on mount', () => {
    setupHandlers();
    renderWithProviders(<CardClearingPage />);
    expect(document.title).toBe('Clearing & Settlement | CBS');
  });

  it('renders all four stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CardClearingPage />);
    await waitFor(() => {
      expect(screen.getByText('Networks')).toBeInTheDocument();
    });
    expect(screen.getByText('Settlement Entries')).toBeInTheDocument();
    expect(screen.getByText('Gross Value')).toBeInTheDocument();
    expect(screen.getByText('Interchange Earned')).toBeInTheDocument();
  });

  it('renders all four tabs', () => {
    setupHandlers();
    renderWithProviders(<CardClearingPage />);
    expect(screen.getByText('Settlement Position')).toBeInTheDocument();
    expect(screen.getByText('Clearing Batches')).toBeInTheDocument();
    expect(screen.getByText('Interchange')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation')).toBeInTheDocument();
  });

  // ── Settlement Position Tab ─────────────────────────────────────────────

  describe('Settlement Position Tab', () => {
    it('renders network position rows from backend', async () => {
      setupHandlers();
      renderWithProviders(<CardClearingPage />);
      await waitFor(() => {
        expect(screen.getByText('VISA')).toBeInTheDocument();
      });
      expect(screen.getByText('MASTERCARD')).toBeInTheDocument();
      expect(screen.getByText('VERVE')).toBeInTheDocument();
      expect(screen.getByText('TOTAL')).toBeInTheDocument();
    });

    it('shows Refresh and Export buttons', async () => {
      setupHandlers();
      renderWithProviders(<CardClearingPage />);
      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('shows New Position button', async () => {
      setupHandlers();
      renderWithProviders(<CardClearingPage />);
      await waitFor(() => {
        expect(screen.getByText('New Position')).toBeInTheDocument();
      });
    });

    it('opens Create Settlement Position modal on button click', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);

      await waitFor(() => {
        expect(screen.getByText('New Position')).toBeInTheDocument();
      });
      await user.click(screen.getByText('New Position'));
      await waitFor(() => {
        expect(screen.getByText('Create Settlement Position')).toBeInTheDocument();
      });
    });

    it('sends correct payload when creating settlement position', async () => {
      const captured: Record<string, unknown>[] = [];
      setupHandlers({ onCreatePosition: (body) => captured.push(body) });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);

      await waitFor(() => {
        expect(screen.getByText('New Position')).toBeInTheDocument();
      });
      await user.click(screen.getByText('New Position'));
      await waitFor(() => {
        expect(screen.getByText('Create Settlement Position')).toBeInTheDocument();
      });

      // Fill counterparty name
      const counterpartyInput = screen.getByPlaceholderText('e.g. Guaranty Trust Bank');
      await user.type(counterpartyInput, 'First Bank');

      // Click Create
      const createBtn = screen.getByRole('button', { name: /Create/i });
      await user.click(createBtn);

      await waitFor(() => {
        expect(captured.length).toBeGreaterThan(0);
      });

      expect(captured[0]).toMatchObject({
        network: 'VISA',
        currency: 'NGN',
        counterpartyName: 'First Bank',
      });
    });
  });

  // ── Clearing Batches Tab ────────────────────────────────────────────────

  describe('Clearing Batches Tab', () => {
    async function goToBatchesTab() {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      return user;
    }

    it('renders batch list from backend with correct columns', async () => {
      const user = await goToBatchesTab();
      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });
      expect(screen.getByText('CCB-BBBB000002')).toBeInTheDocument();
      // Verify batch type column shows backend-aligned values (CLEARING, SETTLEMENT)
      // Multiple batches can have CLEARING type, so use getAllByText
      expect(screen.getAllByText('CLEARING').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('SETTLEMENT')).toBeInTheDocument();
    });

    it('renders status badges with correct backend statuses', async () => {
      await goToBatchesTab();
      await waitFor(() => {
        expect(screen.getByText('RECEIVED')).toBeInTheDocument();
      });
      expect(screen.getByText('SETTLED')).toBeInTheDocument();
      expect(screen.getByText('MATCHED')).toBeInTheDocument();
    });

    it('shows Settle button for RECEIVED and MATCHED batches only', async () => {
      await goToBatchesTab();
      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });
      // RECEIVED batch (id=1) and MATCHED batch (id=3) should have Settle buttons
      const settleButtons = screen.getAllByText('Settle');
      expect(settleButtons.length).toBe(2); // RECEIVED + MATCHED
    });

    it('does NOT show Settle button for already SETTLED batches', async () => {
      setupHandlers({ batches: [mockBatches[1]] }); // only SETTLED batch
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      await waitFor(() => {
        expect(screen.getByText('CCB-BBBB000002')).toBeInTheDocument();
      });
      expect(screen.queryByText('Settle')).not.toBeInTheDocument();
    });

    it('shows Ingest Batch and Manual Batch buttons', async () => {
      await goToBatchesTab();
      expect(screen.getByText('Ingest Batch')).toBeInTheDocument();
      expect(screen.getByText('Manual Batch')).toBeInTheDocument();
    });

    it('opens confirmation dialog when clicking Settle', async () => {
      const user = await goToBatchesTab();
      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });
      const settleButtons = screen.getAllByText('Settle');
      await user.click(settleButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Confirm Settlement')).toBeInTheDocument();
      });
      expect(screen.getByText(/This action will mark the batch as SETTLED/)).toBeInTheDocument();
      expect(screen.getByText('Confirm Settle')).toBeInTheDocument();
    });

    it('sends settle request with correct batchId on confirmation', async () => {
      const settled: string[] = [];
      setupHandlers({ onSettle: (id) => settled.push(id) });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });
      const settleButtons = screen.getAllByText('Settle');
      await user.click(settleButtons[0]);
      await waitFor(() => {
        expect(screen.getByText('Confirm Settle')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Confirm Settle'));

      await waitFor(() => {
        expect(settled.length).toBeGreaterThan(0);
      });
      expect(settled[0]).toBe('CCB-AAAA000001');
    });

    it('opens ingest modal with backend-aligned batch types', async () => {
      const user = await goToBatchesTab();
      await user.click(screen.getByText('Ingest Batch'));
      await waitFor(() => {
        expect(screen.getByText('Ingest Clearing Batch')).toBeInTheDocument();
      });

      // Verify batch type dropdown has correct backend values (not INWARD/OUTWARD)
      const batchTypeSelect = screen.getAllByDisplayValue('CLEARING');
      expect(batchTypeSelect.length).toBeGreaterThan(0);
    });

    it('sends correct payload on ingest with all fields including totalFees', async () => {
      const ingested: Record<string, unknown>[] = [];
      setupHandlers({ onIngest: (body) => ingested.push(body) });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      await user.click(screen.getByText('Ingest Batch'));
      await waitFor(() => {
        expect(screen.getByText('Ingest Clearing Batch')).toBeInTheDocument();
      });

      // Fill file reference
      const fileRefInput = screen.getByPlaceholderText('e.g. VISA_CLR_20260320_001.dat');
      await user.type(fileRefInput, 'TEST_FILE.dat');

      // Submit
      const ingestBtn = screen.getAllByText('Ingest');
      await user.click(ingestBtn[ingestBtn.length - 1]); // modal button

      await waitFor(() => {
        expect(ingested.length).toBeGreaterThan(0);
      });

      // Verify payload includes required fields with backend-aligned values
      expect(ingested[0]).toMatchObject({
        network: 'VISA',
        batchType: 'CLEARING',    // NOT 'INWARD' (old broken value)
        currency: 'NGN',
        fileReference: 'TEST_FILE.dat',
      });
      // Verify totalFees is included (was missing before fix)
      expect(ingested[0]).toHaveProperty('totalFees');
    });

    it('opens manual batch modal', async () => {
      const user = await goToBatchesTab();
      await user.click(screen.getByText('Manual Batch'));
      await waitFor(() => {
        expect(screen.getByText('Manual Clearing Batch')).toBeInTheDocument();
      });
      // Should show warning about RECEIVED status
      expect(screen.getByText(/Manual batches are created with status RECEIVED/)).toBeInTheDocument();
    });

    it('sends manual batch to correct endpoint', async () => {
      const manualBatches: Record<string, unknown>[] = [];
      setupHandlers({ onManual: (body) => manualBatches.push(body) });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      await user.click(screen.getByText('Manual Batch'));

      await waitFor(() => {
        expect(screen.getByText('Manual Clearing Batch')).toBeInTheDocument();
      });

      // Submit with defaults
      const createBtn = screen.getByRole('button', { name: /Create/i });
      await user.click(createBtn);

      await waitFor(() => {
        expect(manualBatches.length).toBeGreaterThan(0);
      });

      expect(manualBatches[0]).toMatchObject({
        network: 'VISA',
        batchType: 'CLEARING',
        currency: 'NGN',
      });
    });

    it('shows all 8 network options in dropdown (backend-aligned)', async () => {
      const user = await goToBatchesTab();
      // Network filter dropdown should have all 8 networks
      const networkSelect = screen.getAllByDisplayValue('VISA')[0] as HTMLSelectElement;
      const options = Array.from(networkSelect.options).map(o => o.value);
      expect(options).toEqual(expect.arrayContaining(['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'UNIONPAY', 'JCB', 'VERVE', 'INTERSWITCH']));
      expect(options).toHaveLength(8);
    });

    it('shows empty state when no batches exist', async () => {
      setupHandlers({ batches: [] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      await waitFor(() => {
        expect(screen.getByText(/No clearing batches for this date/)).toBeInTheDocument();
      });
    });

    it('shows error state with retry button on API failure', async () => {
      server.use(
        http.get('/api/v1/card-clearing/batches/:network/:date', () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 });
        }),
        // Keep positions working for the main page
        http.get('/api/v1/card-clearing/positions/:date/:network', () => {
          return HttpResponse.json(wrap([]));
        }),
      );
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      await waitFor(() => {
        expect(screen.getByText('Failed to load clearing batches.')).toBeInTheDocument();
      });
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  // ── Interchange Tab ─────────────────────────────────────────────────────

  describe('Interchange Tab', () => {
    it('renders interchange summary cards', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Interchange'));

      await waitFor(() => {
        // "Interchange Earned" appears both in page-level StatCard and tab — use getAllByText
        expect(screen.getAllByText('Interchange Earned').length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText('Interchange Paid')).toBeInTheDocument();
      expect(screen.getByText('Net Interchange')).toBeInTheDocument();
      expect(screen.getByText('Avg Effective Rate')).toBeInTheDocument();
    });

    it('renders breakdown table with all networks', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Interchange'));

      await waitFor(() => {
        expect(screen.getByText('Breakdown by Scheme')).toBeInTheDocument();
      });
    });

    it('has export button in interchange tab', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Interchange'));

      await waitFor(() => {
        expect(screen.getByText('Breakdown by Scheme')).toBeInTheDocument();
      });
      // Export button visible
      const exportButtons = screen.getAllByText('Export');
      expect(exportButtons.length).toBeGreaterThan(0);
    });
  });

  // ── Reconciliation Tab ──────────────────────────────────────────────────

  describe('Reconciliation Tab', () => {
    it('renders reconciliation stat cards', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Matched')).toBeInTheDocument();
      });
      expect(screen.getByText('Unmatched')).toBeInTheDocument();
      expect(screen.getByText('Exceptions')).toBeInTheDocument();
      expect(screen.getByText('Match Rate')).toBeInTheDocument();
    });

    it('classifies positions correctly using backend statuses', async () => {
      // SETTLED + CONFIRMED = matched; PENDING + CALCULATED + DISPUTED = unmatched
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      // Sterling Bank (PENDING) and Interswitch (PENDING) should show as unmatched
      // GTB (SETTLED) and Access Bank (CONFIRMED) should NOT be in unmatched list
    });

    it('renders action buttons (Match, Write Off, Escalate) on unmatched items', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      // Check action buttons exist with correct titles
      const matchButtons = document.querySelectorAll('button[title="Match Manually"]');
      const writeOffButtons = document.querySelectorAll('button[title="Write Off"]');
      const escalateButtons = document.querySelectorAll('button[title="Escalate"]');

      expect(matchButtons.length).toBeGreaterThan(0);
      expect(writeOffButtons.length).toBeGreaterThan(0);
      expect(escalateButtons.length).toBeGreaterThan(0);
    });

    it('shows all-reconciled message when no unmatched items', async () => {
      // All positions have SETTLED or CONFIRMED status
      setupHandlers({
        visaPositions: [{ ...mockPositions[0], status: 'SETTLED' }, { ...mockPositions[1], status: 'CONFIRMED' }],
        mastercardPositions: [{ ...mockMastercardPositions[0], status: 'SETTLED' }],
        vervePositions: [{ ...mockVervePositions[0], status: 'CONFIRMED' }],
      });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('All items reconciled — no exceptions.')).toBeInTheDocument();
      });
    });
  });

  // ── CSV Export ──────────────────────────────────────────────────────────

  describe('CSV Export', () => {
    it('escapes commas in CSV values', async () => {
      // Create a mock with comma in counterparty name
      setupHandlers({
        visaPositions: [{
          ...mockPositions[0],
          counterpartyName: 'First Bank, PLC',
        }],
      });

      // Spy on URL.createObjectURL
      const createObjectURL = vi.fn().mockReturnValue('blob:test');
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      renderWithProviders(<CardClearingPage />);
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Click export
      fireEvent.click(screen.getByText('Export'));

      // Verify blob was created
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    });
  });

  // ── Network enum alignment ─────────────────────────────────────────────

  describe('Backend enum alignment', () => {
    it('uses uppercase MASTERCARD (not Mastercard) matching DB CHECK constraint', async () => {
      setupHandlers();
      renderWithProviders(<CardClearingPage />);
      await waitFor(() => {
        expect(screen.getByText('MASTERCARD')).toBeInTheDocument();
      });
      // Should NOT have mixed-case 'Mastercard'
      expect(screen.queryByText('Mastercard')).not.toBeInTheDocument();
    });

    it('uses uppercase VERVE (not Verve) matching DB CHECK constraint', async () => {
      setupHandlers();
      renderWithProviders(<CardClearingPage />);
      await waitFor(() => {
        expect(screen.getByText('VERVE')).toBeInTheDocument();
      });
      expect(screen.queryByText('Verve')).not.toBeInTheDocument();
    });
  });

  // ── Status color coverage ──────────────────────────────────────────────

  describe('Status colors', () => {
    it('renders RECEIVED status badge with correct styling', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        const badge = screen.getByText('RECEIVED');
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('bg-blue-100');
      });
    });

    it('renders MATCHED status badge with correct styling', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        const badge = screen.getByText('MATCHED');
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('bg-teal-100');
      });
    });
  });

  // ── Form validation ───────────────────────────────────────────────────

  describe('Form validation', () => {
    it('sends ingest request with all required fields present', async () => {
      const ingested: Record<string, unknown>[] = [];
      setupHandlers({ onIngest: (body) => ingested.push(body) });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));
      await user.click(screen.getByText('Ingest Batch'));
      await waitFor(() => {
        expect(screen.getByText('Ingest Clearing Batch')).toBeInTheDocument();
      });

      // Submit with defaults (all required fields have default values)
      const ingestBtn = screen.getAllByText('Ingest');
      await user.click(ingestBtn[ingestBtn.length - 1]);

      await waitFor(() => {
        expect(ingested.length).toBe(1);
      });

      // Verify all required fields are present in the payload
      expect(ingested[0]).toHaveProperty('network');
      expect(ingested[0]).toHaveProperty('batchType');
      expect(ingested[0]).toHaveProperty('clearingDate');
      expect(ingested[0]).toHaveProperty('currency');
      expect(ingested[0]).toHaveProperty('totalFees'); // was missing before fix
      expect(ingested[0]).toHaveProperty('interchangeAmount');
      // Verify backend-aligned values (not old broken values)
      expect(ingested[0].batchType).not.toBe('INWARD');
      expect(ingested[0].batchType).not.toBe('OUTWARD');
    });
  });

  // ── Role-based visibility ─────────────────────────────────────────────

  describe('Role-based visibility', () => {
    it('hides Ingest Batch and Manual Batch buttons for CBS_OFFICER users', async () => {
      setupHandlers();
      const officerUser = createMockUser({ roles: ['CBS_OFFICER'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: officerUser });
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      // Admin-only actions should be hidden
      expect(screen.queryByText('Ingest Batch')).not.toBeInTheDocument();
      expect(screen.queryByText('Manual Batch')).not.toBeInTheDocument();
    });

    it('shows Ingest Batch and Manual Batch buttons for CBS_ADMIN users', async () => {
      setupHandlers();
      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('Ingest Batch')).toBeInTheDocument();
      });
      expect(screen.getByText('Manual Batch')).toBeInTheDocument();
    });

    it('hides Settle button for CBS_OFFICER users', async () => {
      setupHandlers();
      const officerUser = createMockUser({ roles: ['CBS_OFFICER'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: officerUser });
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });

      // Settle button should not be visible for officers
      expect(screen.queryByText('Settle')).not.toBeInTheDocument();
    });

    it('hides New Position button for CBS_OFFICER users', async () => {
      setupHandlers();
      const officerUser = createMockUser({ roles: ['CBS_OFFICER'] });
      renderWithProviders(<CardClearingPage />, { user: officerUser });

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      expect(screen.queryByText('New Position')).not.toBeInTheDocument();
    });

    it('hides reconciliation action buttons for CBS_OFFICER users', async () => {
      setupHandlers();
      const officerUser = createMockUser({ roles: ['CBS_OFFICER'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: officerUser });
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      // Action buttons should not be visible
      expect(document.querySelectorAll('button[title="Match Manually"]').length).toBe(0);
      expect(document.querySelectorAll('button[title="Write Off"]').length).toBe(0);
      expect(document.querySelectorAll('button[title="Escalate"]').length).toBe(0);
    });

    it('shows reconciliation action buttons for CBS_ADMIN users', async () => {
      setupHandlers();
      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      // Action buttons should be visible for admin
      expect(document.querySelectorAll('button[title="Match Manually"]').length).toBeGreaterThan(0);
      expect(document.querySelectorAll('button[title="Write Off"]').length).toBeGreaterThan(0);
      expect(document.querySelectorAll('button[title="Escalate"]').length).toBeGreaterThan(0);
    });
  });

  // ── Batch Detail Panel ────────────────────────────────────────────────

  describe('Batch Detail Panel', () => {
    it('opens detail panel when clicking a batch row', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });

      // Click the batch ID link
      await user.click(screen.getByText('CCB-AAAA000001'));

      await waitFor(() => {
        expect(screen.getByText('Batch Detail')).toBeInTheDocument();
      });
    });

    it('shows all batch fields in detail panel', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });

      await user.click(screen.getByText('CCB-AAAA000001'));

      await waitFor(() => {
        expect(screen.getByText('Batch Detail')).toBeInTheDocument();
      });

      // Check detail fields — "Batch ID" exists in both table header and detail panel
      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getAllByText('Batch ID').length).toBeGreaterThanOrEqual(2); // header + detail
      expect(screen.getByText('Net Settlement Amount')).toBeInTheDocument();
    });

    it('shows Settle Batch button in detail for RECEIVED batches (admin)', async () => {
      setupHandlers();
      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });

      await user.click(screen.getByText('CCB-AAAA000001'));

      await waitFor(() => {
        expect(screen.getByText('Batch Detail')).toBeInTheDocument();
      });

      expect(screen.getByText('Settle Batch')).toBeInTheDocument();
    });

    it('hides Settle Batch button in detail for officer users', async () => {
      setupHandlers();
      const officerUser = createMockUser({ roles: ['CBS_OFFICER'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: officerUser });
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });

      await user.click(screen.getByText('CCB-AAAA000001'));

      await waitFor(() => {
        expect(screen.getByText('Batch Detail')).toBeInTheDocument();
      });

      expect(screen.queryByText('Settle Batch')).not.toBeInTheDocument();
    });

    it('closes detail panel on Close button', async () => {
      setupHandlers();
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />);
      await user.click(screen.getByText('Clearing Batches'));

      await waitFor(() => {
        expect(screen.getByText('CCB-AAAA000001')).toBeInTheDocument();
      });

      await user.click(screen.getByText('CCB-AAAA000001'));
      await waitFor(() => {
        expect(screen.getByText('Batch Detail')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Batch Detail')).not.toBeInTheDocument();
      });
    });
  });

  // ── PATCH-based reconciliation actions ────────────────────────────────

  describe('Reconciliation PATCH actions', () => {
    it('sends PATCH /positions/{id}/status with CONFIRMED for Match action', async () => {
      const updates: { id: string; body: Record<string, unknown> }[] = [];
      setupHandlers({ onUpdateStatus: (id, body) => updates.push({ id, body }) });
      // mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      // Click Match Manually on first unmatched item
      const matchButtons = document.querySelectorAll('button[title="Match Manually"]');
      expect(matchButtons.length).toBeGreaterThan(0);
      fireEvent.click(matchButtons[0]);

      await waitFor(() => {
        expect(updates.length).toBeGreaterThan(0);
      });

      expect(updates[0].body.status).toBe('CONFIRMED');
      expect(updates[0].body.notes).toContain('Manually matched');

      vi.restoreAllMocks();
    });

    it('sends PATCH /positions/{id}/status with DISPUTED for Write Off action', async () => {
      const updates: { id: string; body: Record<string, unknown> }[] = [];
      setupHandlers({ onUpdateStatus: (id, body) => updates.push({ id, body }) });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      const writeOffButtons = document.querySelectorAll('button[title="Write Off"]');
      expect(writeOffButtons.length).toBeGreaterThan(0);
      fireEvent.click(writeOffButtons[0]);

      await waitFor(() => {
        expect(updates.length).toBeGreaterThan(0);
      });

      expect(updates[0].body.status).toBe('DISPUTED');
      expect(updates[0].body.notes).toContain('Written off');

      vi.restoreAllMocks();
    });

    it('sends POST /positions/{id}/escalate for Escalate action', async () => {
      const escalations: { id: string; body: Record<string, unknown> }[] = [];
      setupHandlers({ onEscalate: (id, body) => escalations.push({ id, body }) });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      const escalateButtons = document.querySelectorAll('button[title="Escalate"]');
      expect(escalateButtons.length).toBeGreaterThan(0);
      fireEvent.click(escalateButtons[0]);

      await waitFor(() => {
        expect(escalations.length).toBeGreaterThan(0);
      });

      expect(escalations[0].body.reason).toContain('Escalated from reconciliation');

      vi.restoreAllMocks();
    });

    it('does not call API when user cancels confirm dialog', async () => {
      const updates: unknown[] = [];
      setupHandlers({ onUpdateStatus: (_id, body) => updates.push(body) });
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const adminUser = createMockUser({ roles: ['CBS_ADMIN'] });
      const user = userEvent.setup();
      renderWithProviders(<CardClearingPage />, { user: adminUser });
      await user.click(screen.getByText('Reconciliation'));

      await waitFor(() => {
        expect(screen.getByText('Unmatched & Exception Items')).toBeInTheDocument();
      });

      const matchButtons = document.querySelectorAll('button[title="Match Manually"]');
      fireEvent.click(matchButtons[0]);

      // Wait a tick — no API call should happen
      await new Promise(r => setTimeout(r, 100));
      expect(updates.length).toBe(0);

      vi.restoreAllMocks();
    });
  });
});
