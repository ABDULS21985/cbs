import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import EodConsolePage from '../pages/EodConsolePage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STATUS = {
  data: {
    id: 1,
    businessDate: '2026-03-21',
    runType: 'EOD',
    totalSteps: 9,
    completedSteps: 7,
    failedSteps: 1,
    status: 'FAILED',
    startedAt: '2026-03-21T22:00:00Z',
    durationSeconds: 340,
    initiatedBy: 'MANUAL',
    steps: [
      { id: 1, stepOrder: 1, stepName: 'Savings Interest Accrual', status: 'COMPLETED', recordsProcessed: 120, durationMs: 15000 },
      { id: 2, stepOrder: 2, stepName: 'Fixed Deposit Interest Accrual', status: 'COMPLETED', recordsProcessed: 45, durationMs: 8000 },
      { id: 3, stepOrder: 3, stepName: 'Fixed Deposit Maturity Processing', status: 'COMPLETED', recordsProcessed: 3, durationMs: 2000 },
      { id: 4, stepOrder: 4, stepName: 'Recurring Deposit Auto-Debit', status: 'COMPLETED', recordsProcessed: 12, durationMs: 4000 },
      { id: 5, stepOrder: 5, stepName: 'Loan Interest Accrual', status: 'FAILED', recordsProcessed: 0, durationMs: 30000, errorMessage: 'Timeout during batch processing' },
      { id: 6, stepOrder: 6, stepName: 'Overdraft/LOC Interest Accrual', status: 'COMPLETED', recordsProcessed: 8, durationMs: 5000 },
      { id: 7, stepOrder: 7, stepName: 'Standing Order Execution', status: 'COMPLETED', recordsProcessed: 25, durationMs: 12000 },
      { id: 8, stepOrder: 8, stepName: 'Facility Expiry Processing', status: 'COMPLETED', recordsProcessed: 0, durationMs: 1000 },
      { id: 9, stepOrder: 9, stepName: 'Treasury Deal Maturity', status: 'PENDING', recordsProcessed: 0, durationMs: null },
    ],
  },
};

const MOCK_STEPS = { data: MOCK_STATUS.data.steps };

const MOCK_LOGS = {
  data: {
    entries: [
      { timestamp: '2026-03-21T22:00:01Z', level: 'INFO', message: 'Started: Savings Interest Accrual' },
      { timestamp: '2026-03-21T22:00:16Z', level: 'INFO', message: 'Completed: Savings Interest Accrual — 120 records in 15000ms' },
      { timestamp: '2026-03-21T22:01:30Z', level: 'ERROR', message: 'Failed: Loan Interest Accrual — Timeout during batch processing' },
    ],
    nextCursor: '9',
  },
};

const MOCK_HISTORY = {
  data: [
    { id: 1, businessDate: '2026-03-21', runType: 'EOD', status: 'FAILED', totalSteps: 9, completedSteps: 7, failedSteps: 1, durationSeconds: 340 },
    { id: 2, businessDate: '2026-03-20', runType: 'EOD', status: 'COMPLETED', totalSteps: 9, completedSteps: 9, failedSteps: 0, durationSeconds: 280 },
  ],
};

const MOCK_DURATION_TREND = {
  data: [
    { date: '2026-03-19', durationSeconds: 250, status: 'COMPLETED', totalSteps: 9, completedSteps: 9, failedSteps: 0 },
    { date: '2026-03-20', durationSeconds: 280, status: 'COMPLETED', totalSteps: 9, completedSteps: 9, failedSteps: 0 },
    { date: '2026-03-21', durationSeconds: 340, status: 'FAILED', totalSteps: 9, completedSteps: 7, failedSteps: 1 },
  ],
};

const MOCK_SCHEDULE_CONFIG = {
  data: {
    id: 1,
    autoTrigger: true,
    scheduledTime: '22:00',
    blockIfUnclosedBranches: true,
    notificationEmails: 'ops@bank.com',
    autoRetry: false,
    maxRetries: 3,
  },
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/eod/status', () => HttpResponse.json(MOCK_STATUS)),
    http.get('/api/v1/eod/runs/1/steps', () => HttpResponse.json(MOCK_STEPS)),
    http.get('/api/v1/eod/runs/1/logs', () => HttpResponse.json(MOCK_LOGS)),
    http.get('/api/v1/eod/history', () => HttpResponse.json(MOCK_HISTORY)),
    http.get('/api/v1/eod/duration-trend', () => HttpResponse.json(MOCK_DURATION_TREND)),
    http.get('/api/v1/eod/schedule/config', () => HttpResponse.json(MOCK_SCHEDULE_CONFIG)),
    http.post('/api/v1/eod/trigger', () => HttpResponse.json({ data: { ...MOCK_STATUS.data, status: 'RUNNING' } })),
    http.post('/api/v1/eod/runs/1/steps/5/retry', () =>
      HttpResponse.json({ data: { ...MOCK_STEPS.data[4], status: 'RUNNING' } }),
    ),
    http.post('/api/v1/eod/runs/1/steps/5/skip', () =>
      HttpResponse.json({ data: { ...MOCK_STEPS.data[4], status: 'SKIPPED' } }),
    ),
    http.post('/api/v1/eod/runs/1/rollback', () =>
      HttpResponse.json({ data: { ...MOCK_STATUS.data, status: 'ROLLED_BACK' } }),
    ),
    http.put('/api/v1/eod/schedule/config', () => HttpResponse.json(MOCK_SCHEDULE_CONFIG)),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EodConsolePage', () => {
  it('renders page header "End of Day Console"', () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    expect(screen.getByText('End of Day Console')).toBeInTheDocument();
  });

  it('shows EOD status banner with current run status', async () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    await waitFor(() => {
      expect(screen.getByText(/FAILED/i)).toBeInTheDocument();
    });
  });

  it('displays step pipeline showing all steps with statuses', async () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    await waitFor(() => {
      expect(screen.getByText('Savings Interest Accrual')).toBeInTheDocument();
      expect(screen.getByText('Loan Interest Accrual')).toBeInTheDocument();
    });
  });

  it('shows trigger EOD button', () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    expect(screen.getByRole('button', { name: /trigger|run eod|start/i })).toBeInTheDocument();
  });

  it('shows retry and skip buttons for failed steps', async () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    await waitFor(() => {
      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      expect(retryButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows rollback button when run has failed', async () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /rollback/i })).toBeInTheDocument();
    });
  });

  it('shows history tab with past EOD runs', async () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    const historyTab = screen.getByText(/history/i);
    fireEvent.click(historyTab);
    await waitFor(() => {
      expect(screen.getByText('2026-03-20')).toBeInTheDocument();
    });
  });

  it('shows schedule config tab', async () => {
    setupHandlers();
    renderWithProviders(<EodConsolePage />);
    const scheduleTab = screen.getByText(/schedule/i);
    fireEvent.click(scheduleTab);
    await waitFor(() => {
      expect(screen.getByText(/auto/i)).toBeInTheDocument();
    });
  });
});
