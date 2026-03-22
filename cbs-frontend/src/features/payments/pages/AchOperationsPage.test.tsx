import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import AchOperationsPage from './AchOperationsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockOutboundBatches = [
  {
    id: 'ob-1',
    batchNumber: 'ACH-OUT-001',
    type: 'CREDIT',
    itemCount: 25,
    totalAmount: 54000.0,
    currency: 'USD',
    submittedAt: '2026-03-20T14:30:00Z',
    effectiveDate: '2026-03-21',
    settlementDate: '2026-03-22',
    status: 'SUBMITTED',
    originatorName: 'Acme Corp',
    companyId: 'ACME001',
  },
  {
    id: 'ob-2',
    batchNumber: 'ACH-OUT-002',
    type: 'DEBIT',
    itemCount: 10,
    totalAmount: 12500.0,
    currency: 'USD',
    submittedAt: '2026-03-19T09:00:00Z',
    effectiveDate: '2026-03-20',
    settlementDate: '2026-03-21',
    status: 'SETTLED',
    originatorName: 'Acme Corp',
    companyId: 'ACME001',
  },
];

const mockInboundBatches = [
  {
    id: 'ib-1',
    batchNumber: 'ACH-IN-001',
    type: 'CREDIT',
    itemCount: 15,
    totalAmount: 32000.0,
    currency: 'USD',
    submittedAt: '2026-03-20T10:15:00Z',
    effectiveDate: '2026-03-21',
    settlementDate: '2026-03-22',
    status: 'ACCEPTED',
    originatorName: 'Global Payroll Inc',
    companyId: 'GPAY001',
  },
];

const mockReturns = [
  {
    id: 'ret-1',
    originalRef: 'ACH-OUT-001-003',
    returnCode: 'R01',
    returnReason: 'Insufficient Funds',
    amount: 1500.0,
    returnDate: '2026-03-21T08:00:00Z',
    status: 'PROCESSED',
  },
  {
    id: 'ret-2',
    originalRef: 'ACH-OUT-001-012',
    returnCode: 'R03',
    returnReason: 'No Account / Unable to Locate Account',
    amount: 750.0,
    returnDate: '2026-03-21T08:30:00Z',
    status: 'PENDING',
  },
];

const mockSettlements = [
  {
    date: '2026-03-22',
    counterparty: 'Federal Reserve',
    debitCount: 45,
    creditCount: 30,
    netPosition: 22500.0,
    status: 'PENDING',
  },
  {
    date: '2026-03-21',
    counterparty: 'Federal Reserve',
    debitCount: 60,
    creditCount: 55,
    netPosition: -8500.0,
    status: 'SETTLED',
  },
  {
    date: '2026-03-22',
    counterparty: 'EPN Network',
    debitCount: 12,
    creditCount: 8,
    netPosition: 4200.0,
    status: 'PENDING',
  },
];

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function setupHandlers() {
  server.use(
    http.get('/api/v1/ach/outbound', () => HttpResponse.json(wrap(mockOutboundBatches))),
    http.get('/api/v1/ach/inbound', () => HttpResponse.json(wrap(mockInboundBatches))),
    http.get('/api/v1/ach/returns', () => HttpResponse.json(wrap(mockReturns))),
    http.get('/api/v1/ach/settlement', () => HttpResponse.json(wrap(mockSettlements))),
  );
}

function setupEmptyHandlers() {
  server.use(
    http.get('/api/v1/ach/outbound', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/ach/inbound', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/ach/returns', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/ach/settlement', () => HttpResponse.json(wrap([]))),
  );
}

function setupErrorHandlers() {
  server.use(
    http.get('/api/v1/ach/outbound', () =>
      HttpResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 }),
    ),
    http.get('/api/v1/ach/inbound', () =>
      HttpResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 }),
    ),
    http.get('/api/v1/ach/returns', () =>
      HttpResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 }),
    ),
    http.get('/api/v1/ach/settlement', () =>
      HttpResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 }),
    ),
  );
}

/** Click a Radix UI tab trigger. Uses userEvent for proper pointer event support. */
async function clickTab(name: string) {
  const user = userEvent.setup();
  const tab = screen.getByRole('tab', { name });
  await user.click(tab);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AchOperationsPage', () => {
  // ---- Page header & subtitle ----

  describe('page header', () => {
    it('renders the page title', () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      expect(screen.getByText('ACH Operations')).toBeInTheDocument();
    });

    it('renders the subtitle description', () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      expect(
        screen.getByText('Manage ACH batch payments, inbound entries, returns, and settlement'),
      ).toBeInTheDocument();
    });
  });

  // ---- Tabs ----

  describe('tabs', () => {
    it('renders all four tab triggers', () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      expect(screen.getByRole('tab', { name: 'Outbound Batches' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Inbound Batches' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Returns' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Settlement' })).toBeInTheDocument();
    });

    it('defaults to the Outbound Batches tab', () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      const outboundTab = screen.getByRole('tab', { name: 'Outbound Batches' });
      expect(outboundTab).toHaveAttribute('data-state', 'active');
    });

    it('switches to Inbound Batches tab on click', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Inbound Batches');
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Inbound Batches' })).toHaveAttribute('data-state', 'active');
      });
    });

    it('switches to Returns tab on click', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Returns' })).toHaveAttribute('data-state', 'active');
      });
    });

    it('switches to Settlement tab on click', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Settlement');
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Settlement' })).toHaveAttribute('data-state', 'active');
      });
    });

    it('deactivates previous tab when switching', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Returns' })).toHaveAttribute('data-state', 'active');
        expect(screen.getByRole('tab', { name: 'Outbound Batches' })).toHaveAttribute('data-state', 'inactive');
      });
    });
  });

  // ---- Outbound Batches tab ----

  describe('Outbound Batches tab', () => {
    it('displays outbound batch data in the table', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('ACH-OUT-001')).toBeInTheDocument();
      });
      expect(screen.getByText('ACH-OUT-002')).toBeInTheDocument();
    });

    it('shows the New ACH Batch button for outbound mode', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('New ACH Batch')).toBeInTheDocument();
      });
    });

    it('displays batch status badges', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      });
      expect(screen.getByText('SETTLED')).toBeInTheDocument();
    });

    it('displays batch type badges', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('CREDIT')).toBeInTheDocument();
      });
      expect(screen.getByText('DEBIT')).toBeInTheDocument();
    });
  });

  // ---- Inbound Batches tab ----

  describe('Inbound Batches tab', () => {
    it('displays inbound batch data when tab is selected', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Inbound Batches');
      await waitFor(() => {
        expect(screen.getByText('ACH-IN-001')).toBeInTheDocument();
      });
    });

    it('shows ACCEPTED status for the inbound batch', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Inbound Batches');
      await waitFor(() => {
        expect(screen.getByText('ACCEPTED')).toBeInTheDocument();
      });
    });
  });

  // ---- Returns tab ----

  describe('Returns tab', () => {
    it('displays return entries when tab is selected', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByText('ACH-OUT-001-003')).toBeInTheDocument();
      });
      expect(screen.getByText('ACH-OUT-001-012')).toBeInTheDocument();
    });

    it('shows return codes', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByText('R01')).toBeInTheDocument();
      });
      expect(screen.getByText('R03')).toBeInTheDocument();
    });

    it('shows return code descriptions', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        // "Insufficient Funds" appears in both the return code column and the reason column
        expect(screen.getAllByText('Insufficient Funds').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ---- Settlement tab ----

  describe('Settlement tab', () => {
    it('displays the settlement summary heading', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Settlement');
      await waitFor(() => {
        expect(screen.getByText('Settlement Summary')).toBeInTheDocument();
      });
    });

    it('displays counterparty names in the settlement table', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Settlement');
      await waitFor(() => {
        expect(screen.getAllByText('Federal Reserve').length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText('EPN Network')).toBeInTheDocument();
    });

    it('displays the 7-day settlement calendar', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Settlement');
      await waitFor(() => {
        expect(screen.getByText('7-Day Settlement Calendar')).toBeInTheDocument();
      });
    });
  });

  // ---- Stat cards ----

  describe('stat cards', () => {
    it('displays the Outbound Batches stat card label', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      // Stat cards render skeletons while loading; wait for data
      await waitFor(() => {
        const statLabels = screen.getAllByText('Outbound Batches');
        expect(statLabels.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays the Inbound Batches stat card label', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        const statLabels = screen.getAllByText('Inbound Batches');
        expect(statLabels.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays the Pending Settlement stat card label', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Pending Settlement')).toBeInTheDocument();
      });
    });

    it('displays the Return Rate stat card label', async () => {
      setupHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('Return Rate')).toBeInTheDocument();
      });
    });
  });

  // ---- Empty states ----

  describe('empty states', () => {
    it('shows empty message for outbound batches when no data', async () => {
      setupEmptyHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('No batches found')).toBeInTheDocument();
      });
    });

    it('shows empty message for inbound batches when no data', async () => {
      setupEmptyHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Inbound Batches');
      await waitFor(() => {
        expect(screen.getByText('No batches found')).toBeInTheDocument();
      });
    });

    it('shows empty message for returns when no data', async () => {
      setupEmptyHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByText('No returns found')).toBeInTheDocument();
      });
    });

    it('shows empty message for settlement when no data', async () => {
      setupEmptyHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Settlement');
      await waitFor(() => {
        expect(screen.getByText('No settlement data available')).toBeInTheDocument();
      });
    });
  });

  // ---- Error handling ----

  describe('error handling', () => {
    it('does not crash when outbound API returns an error', async () => {
      setupErrorHandlers();
      renderWithProviders(<AchOperationsPage />);
      // The page should still render its header even when APIs fail
      expect(screen.getByText('ACH Operations')).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.getByText('Manage ACH batch payments, inbound entries, returns, and settlement'),
        ).toBeInTheDocument();
      });
    });

    it('renders all tabs even when APIs fail', async () => {
      setupErrorHandlers();
      renderWithProviders(<AchOperationsPage />);
      expect(screen.getByRole('tab', { name: 'Outbound Batches' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Inbound Batches' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Returns' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Settlement' })).toBeInTheDocument();
    });

    it('still allows tab switching when APIs fail', async () => {
      setupErrorHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Returns' })).toHaveAttribute('data-state', 'active');
      });
    });

    it('shows empty state for outbound when API errors', async () => {
      setupErrorHandlers();
      renderWithProviders(<AchOperationsPage />);
      await waitFor(() => {
        expect(screen.getByText('No batches found')).toBeInTheDocument();
      });
    });

    it('shows empty state for returns when API errors', async () => {
      setupErrorHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Returns');
      await waitFor(() => {
        expect(screen.getByText('No returns found')).toBeInTheDocument();
      });
    });

    it('shows empty state for settlement when API errors', async () => {
      setupErrorHandlers();
      renderWithProviders(<AchOperationsPage />);
      await clickTab('Settlement');
      await waitFor(() => {
        expect(screen.getByText('No settlement data available')).toBeInTheDocument();
      });
    });
  });
});
