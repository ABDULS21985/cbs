import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { CustodySettlementPage } from '../pages/CustodySettlementPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DASHBOARD = { data: { totalPending: 5, totalSettled: 20, totalFailed: 3 } };

const MOCK_INSTRUCTIONS = {
  data: [
    {
      id: 1, instructionRef: 'SI-TEST001', custodyAccountId: 1, instructionType: 'DVP',
      settlementAmount: 100000, currency: 'USD', instrumentCode: 'BOND-001',
      counterpartyCode: 'CP-001', counterpartyName: 'Test Bank',
      intendedSettlementDate: '2026-03-20', status: 'CREATED', matchStatus: 'UNMATCHED',
    },
    {
      id: 2, instructionRef: 'SI-TEST002', custodyAccountId: 2, instructionType: 'FOP',
      settlementAmount: 50000, currency: 'EUR', instrumentCode: 'EQ-001',
      counterpartyCode: 'CP-002', counterpartyName: 'Broker Inc',
      intendedSettlementDate: '2026-03-21', status: 'MATCHED', matchStatus: 'MATCHED',
    },
    {
      id: 3, instructionRef: 'SI-TEST003', custodyAccountId: 1, instructionType: 'DVP',
      settlementAmount: 75000, currency: 'USD', instrumentCode: 'BOND-002',
      counterpartyCode: 'CP-001', counterpartyName: 'Test Bank',
      intendedSettlementDate: '2026-03-22', status: 'SETTLING', matchStatus: 'MATCHED',
    },
    {
      id: 4, instructionRef: 'SI-TEST004', custodyAccountId: 3, instructionType: 'DVP',
      settlementAmount: 200000, currency: 'GBP', instrumentCode: 'BOND-003',
      counterpartyCode: 'CP-003', counterpartyName: 'Custodian Ltd',
      intendedSettlementDate: '2026-03-19', status: 'FAILED', matchStatus: 'MATCHED',
      failReason: 'Insufficient securities',
    },
  ],
};

const MOCK_FAILED = { data: MOCK_INSTRUCTIONS.data.filter((i) => i.status === 'FAILED') };

const MOCK_BATCHES = {
  data: [
    {
      id: 1, batchRef: 'SB-BATCH001', depositoryCode: 'DTCC', settlementDate: '2026-03-20',
      totalInstructions: 10, settledCount: 7, failedCount: 2, pendingCount: 1,
      currency: 'USD', status: 'IN_PROGRESS', createdAt: '2026-03-20T08:00:00Z',
    },
  ],
};

const MOCK_ACCOUNTS = {
  data: [
    {
      id: 1, accountCode: 'CUS-ACCT001', accountName: 'Global Securities',
      customerId: 100, accountType: 'GLOBAL_CUSTODY', currency: 'USD',
      totalAssetsValue: 5000000, status: 'ACTIVE', openedAt: '2025-01-15T10:00:00Z',
    },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/settlements/dashboard', () => HttpResponse.json(MOCK_DASHBOARD)),
    http.get('/api/v1/settlements/instructions', () => HttpResponse.json(MOCK_INSTRUCTIONS)),
    http.get('/api/v1/settlements/failed', () => HttpResponse.json(MOCK_FAILED)),
    http.get('/api/v1/settlements/batches', () => HttpResponse.json(MOCK_BATCHES)),
    http.get('/api/v1/custody', () => HttpResponse.json(MOCK_ACCOUNTS)),
    http.post('/api/v1/settlements/instructions', () =>
      HttpResponse.json({ data: MOCK_INSTRUCTIONS.data[0] }, { status: 201 }),
    ),
    http.post('/api/v1/settlements/batches', () =>
      HttpResponse.json({ data: MOCK_BATCHES.data[0] }, { status: 201 }),
    ),
    http.post('/api/v1/custody', () =>
      HttpResponse.json({ data: MOCK_ACCOUNTS.data[0] }, { status: 201 }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CustodySettlementPage', () => {
  it('renders page header "Settlement Management"', () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    expect(screen.getByText('Settlement Management')).toBeInTheDocument();
  });

  it('shows all four tabs: Dashboard, Instructions, Batches, Custody Accounts', () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText('Batches')).toBeInTheDocument();
    expect(screen.getByText('Custody Accounts')).toBeInTheDocument();
  });

  it('Dashboard tab shows stat cards with settlement data', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Pending Match')).toBeInTheDocument();
      // "Settling" appears in both stat card and funnel
      expect(screen.getAllByText('Settling').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Settlement Rate')).toBeInTheDocument();
    });
  });

  it('Dashboard tab shows Settlement Flow funnel', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    await waitFor(() => {
      expect(screen.getByText('Settlement Flow')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Matched')).toBeInTheDocument();
    });
  });

  it('Instructions tab shows New Instruction button', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new instruction/i })).toBeInTheDocument();
    });
  });

  it('Instructions tab displays settlement instruction data in table', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByText('SI-TEST001')).toBeInTheDocument();
      expect(screen.getByText('SI-TEST002')).toBeInTheDocument();
      expect(screen.getByText('SI-TEST003')).toBeInTheDocument();
      expect(screen.getByText('SI-TEST004')).toBeInTheDocument();
    });
  });

  it('New Instruction modal opens on button click', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new instruction/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /new instruction/i }));
    await waitFor(() => {
      expect(screen.getByText('New Settlement Instruction')).toBeInTheDocument();
    });
  });

  it('Status filter pills are rendered including All and status values', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CREATED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'MATCHED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SETTLING' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SETTLED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FAILED' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CANCELLED' })).toBeInTheDocument();
    });
  });

  it('Match button appears for CREATED instructions', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^match$/i })).toBeInTheDocument();
    });
  });

  it('Submit button appears for MATCHED instructions', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument();
    });
  });

  it('Settle and Fail buttons appear for SETTLING instructions', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^settle$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^fail$/i })).toBeInTheDocument();
    });
  });

  it('Retry button appears for FAILED instructions', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Instructions'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('Batches tab shows Create Batch button', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Batches'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create batch/i })).toBeInTheDocument();
    });
  });

  it('Batches tab shows batch data in table', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Batches'));
    await waitFor(() => {
      expect(screen.getByText('SB-BATCH001')).toBeInTheDocument();
    });
  });

  it('Accounts tab shows Open Account button', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Custody Accounts'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open account/i })).toBeInTheDocument();
    });
  });

  it('Accounts tab Open Account modal has GLOBAL_CUSTODY account type option', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Custody Accounts'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open account/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /open account/i }));
    await waitFor(() => {
      expect(screen.getByText('Open Custody Account')).toBeInTheDocument();
      expect(screen.getByText('Global Custody')).toBeInTheDocument();
    });
  });

  it('Accounts tab shows account data in table', async () => {
    setupHandlers();
    renderWithProviders(<CustodySettlementPage />);
    fireEvent.click(screen.getByText('Custody Accounts'));
    await waitFor(() => {
      expect(screen.getByText('CUS-ACCT001')).toBeInTheDocument();
      expect(screen.getByText('Global Securities')).toBeInTheDocument();
    });
  });
});
