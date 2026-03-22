import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { RcaDashboardPage } from './RcaDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockDashboard = {
  totalAnalyses: 42,
  pendingAnalyses: 8,
  completedAnalyses: 24,
  validatedAnalyses: 10,
  byCategory: {
    PROCESS: 15,
    SYSTEM: 12,
    PEOPLE: 8,
    THIRD_PARTY: 5,
    POLICY: 2,
  },
  byStatus: {
    IN_PROGRESS: 8,
    COMPLETED: 24,
    VALIDATED: 10,
  },
  avgDaysToComplete: 5.3,
  totalCasesWithRca: 38,
  financialImpactTotal: 12500000,
};

const mockRecurring = [
  {
    category: 'SYSTEM',
    subCategory: 'Hardware Failure',
    occurrenceCount: 12,
    affectedCases: 10,
    trend: 'INCREASING',
    firstSeen: '2026-01-15',
    lastSeen: '2026-03-18',
    avgResolutionDays: 3.5,
  },
  {
    category: 'PROCESS',
    subCategory: 'Inadequate Validation',
    occurrenceCount: 8,
    affectedCases: 7,
    trend: 'STABLE',
    firstSeen: '2026-02-01',
    lastSeen: '2026-03-10',
    avgResolutionDays: 5.2,
  },
];

const mockPatterns = [
  {
    id: 1,
    patternType: 'RECURRING_ROOT_CAUSE',
    patternDescription: 'Recurring root cause: SYSTEM (5 cases)',
    caseCount: 5,
    dateRangeStart: '2026-01-01',
    dateRangeEnd: '2026-03-22',
    rootCauseCategory: 'SYSTEM',
    trendDirection: 'INCREASING',
    recommendedAction: 'Upgrade ATM hardware fleet',
    priority: 'HIGH',
    status: 'IDENTIFIED',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/root-cause-analysis/dashboard', () =>
      HttpResponse.json(wrap(mockDashboard))
    ),
    http.get('/api/v1/root-cause-analysis/recurring', () =>
      HttpResponse.json(wrap(mockRecurring))
    ),
    http.post('/api/v1/root-cause-analysis/patterns', () =>
      HttpResponse.json(wrap(mockPatterns))
    ),
  );
}

describe('RcaDashboardPage', () => {
  // ── Page Structure ────────────────────────────────────────
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    expect(screen.getByText('RCA Dashboard')).toBeInTheDocument();
  });

  it('renders page subtitle', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    expect(screen.getByText(/Root Cause Analysis patterns/)).toBeInTheDocument();
  });

  it('renders Case Management back button', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    expect(screen.getByText('← Case Management')).toBeInTheDocument();
  });

  // ── Loading State ─────────────────────────────────────────
  it('shows loading skeletons initially', () => {
    server.use(
      http.get('/api/v1/root-cause-analysis/dashboard', () => new Promise(() => {})),
      http.get('/api/v1/root-cause-analysis/recurring', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<RcaDashboardPage />);
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  // ── KPI Cards ─────────────────────────────────────────────
  it('shows all 7 KPI cards after loading', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Analyses')).toBeInTheDocument();
    });
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
    expect(screen.getByText('Cases with RCA')).toBeInTheDocument();
    expect(screen.getByText('Financial Impact')).toBeInTheDocument();
    expect(screen.getByText('Avg Days to Close')).toBeInTheDocument();
  });

  it('displays correct KPI values', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
    expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('24').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('displays financial impact formatted with currency', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('₦12,500,000')).toBeInTheDocument();
    });
  });

  it('displays avg days to close', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('5.3d')).toBeInTheDocument();
    });
  });

  // ── Category Breakdown ────────────────────────────────────
  it('shows Root Causes by Category section', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Root Causes by Category')).toBeInTheDocument();
    });
  });

  it('displays category breakdown entries', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getAllByText('PROCESS').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('SYSTEM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PEOPLE')).toBeInTheDocument();
  });

  // ── Recurring Root Causes ─────────────────────────────────
  it('shows Recurring Root Causes section', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Recurring Root Causes')).toBeInTheDocument();
    });
  });

  it('shows table column headers', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument();
    });
    expect(screen.getByText('Sub-Category')).toBeInTheDocument();
    expect(screen.getByText('Occurrences')).toBeInTheDocument();
    expect(screen.getByText('Cases')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('Last Seen')).toBeInTheDocument();
    expect(screen.getByText('Avg Days')).toBeInTheDocument();
  });

  it('displays recurring root causes data', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Hardware Failure')).toBeInTheDocument();
    });
    expect(screen.getByText('Inadequate Validation')).toBeInTheDocument();
  });

  it('shows occurrence counts', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  it('shows avg resolution days', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('3.5')).toBeInTheDocument();
      expect(screen.getByText('5.2')).toBeInTheDocument();
    });
  });

  it('shows empty state for recurring when none found', async () => {
    server.use(
      http.get('/api/v1/root-cause-analysis/dashboard', () => HttpResponse.json(wrap(mockDashboard))),
      http.get('/api/v1/root-cause-analysis/recurring', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('No recurring root causes found')).toBeInTheDocument();
    });
  });

  it('has date range filters for recurring section', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  });

  // ── Pattern Insights ──────────────────────────────────────
  it('shows Pattern Insights section', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    expect(screen.getByText('Pattern Insights')).toBeInTheDocument();
  });

  it('shows Generate button', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('shows instruction text before generation', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    expect(screen.getByText(/Click "Generate" to analyse/)).toBeInTheDocument();
  });

  it('shows pattern insights after clicking Generate', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => {
      expect(screen.getByText('RECURRING ROOT CAUSE')).toBeInTheDocument();
    });
    expect(screen.getByText(/Upgrade ATM hardware fleet/)).toBeInTheDocument();
  });

  it('shows pattern priority badge', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => {
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  it('shows pattern details (case count, category, trend, status)', async () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('has date range filters for pattern insights', () => {
    setupHandlers();
    renderWithProviders(<RcaDashboardPage />);
    // 4 date inputs total: 2 for recurring, 2 for patterns
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(4);
  });

  // ── Zero Data ─────────────────────────────────────────────
  it('renders without crashing when dashboard returns zeros', async () => {
    server.use(
      http.get('/api/v1/root-cause-analysis/dashboard', () =>
        HttpResponse.json(wrap({
          totalAnalyses: 0,
          pendingAnalyses: 0,
          completedAnalyses: 0,
          validatedAnalyses: 0,
          byCategory: {},
          byStatus: {},
          avgDaysToComplete: 0,
          totalCasesWithRca: 0,
          financialImpactTotal: 0,
        }))
      ),
      http.get('/api/v1/root-cause-analysis/recurring', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<RcaDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Analyses')).toBeInTheDocument();
    });
  });
});
