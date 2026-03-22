import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AlmDashboardPage } from '../pages/AlmDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockGapReport = {
  id: 1,
  reportDate: '2026-03-20',
  currencyCode: 'NGN',
  buckets: [
    { bucket: '0-1M', assets: 20000000000, liabilities: 18000000000, gap: 2000000000, cumulativeGap: 2000000000 },
    { bucket: '1-3M', assets: 15000000000, liabilities: 16000000000, gap: -1000000000, cumulativeGap: 1000000000 },
  ],
  totalRsa: 80000000000,
  totalRsl: 75000000000,
  cumulativeGap: 5000000000,
  gapRatio: 1.0667,
  niiBase: 5000000000,
  niiUp100bp: 5200000000,
  niiDown100bp: 4800000000,
  niiSensitivity: 200000000,
  eveBase: 5000000000,
  eveUp200bp: 4800000000,
  eveDown200bp: 5200000000,
  eveSensitivity: -200000000,
  weightedAvgDurationAssets: 3.5,
  weightedAvgDurationLiabs: 2.1,
  durationGap: 1.4,
  status: 'DRAFT',
  generatedBy: 'treasury_head',
  approvedBy: null,
  createdAt: '2026-03-20T10:00:00Z',
};

const mockDuration = {
  portfolioCode: 'MAIN',
  macaulayDurationAssets: 3.75,
  modifiedDurationAssets: 3.5,
  modifiedDurationLiabilities: 2.1,
  durationGap: 1.4,
  dv01: 125000,
  totalAssetValue: 80000000000,
  totalLiabValue: 75000000000,
  dv01Ladder: [],
  keyRateDurations: [],
  computedAt: '2026-03-20T10:00:00Z',
};

const mockScenarios = [
  { id: 1, scenarioName: 'Parallel +200', scenarioType: 'PARALLEL_UP', shiftBps: { '1Y': 200, '5Y': 200 }, description: 'Parallel up 200bps', isRegulatory: true, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, scenarioName: 'Steepening', scenarioType: 'STEEPENING', shiftBps: { '1Y': 50, '5Y': 200 }, description: 'Yield curve steepening', isRegulatory: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
];

const mockPositions = [
  { id: 1, positionDate: '2026-03-20', currency: 'NGN', timeBucket: 'OVERNIGHT', cashAndEquivalents: 5000000000, interbankPlacements: 2000000000, securitiesHeld: 3000000000, loansAndAdvances: 10000000000, fixedAssets: 1000000000, otherAssets: 500000000, totalAssets: 21500000000, demandDeposits: 8000000000, termDeposits: 6000000000, interbankBorrowings: 3000000000, bondsIssued: 2000000000, otherLiabilities: 1000000000, totalLiabilities: 20000000000, gapAmount: 1500000000, cumulativeGap: 1500000000, gapRatio: 0.075, niiImpactUp100bp: 15000000, niiImpactDown100bp: -15000000, eveImpactUp200bp: -30000000, eveImpactDown200bp: 30000000, durationAssets: 0.01, durationLiabilities: 0.005, durationGap: 0.005, createdAt: '2026-03-20T10:00:00Z' },
];

function setupHandlers(opts?: { reports?: unknown[]; positions?: unknown[]; duration?: unknown; scenarios?: unknown[]; regScenarios?: unknown[] }) {
  const today = new Date().toISOString().split('T')[0];
  server.use(
    http.get('/api/v1/alm/gap-report/:date', () => HttpResponse.json(wrap(opts?.reports ?? [mockGapReport]))),
    http.get('/api/v1/alm/gap-report', () => HttpResponse.json(wrap(opts?.reports ?? [mockGapReport]))),
    http.post('/api/v1/alm/gap-report', () => HttpResponse.json(wrap(mockGapReport))),
    http.post('/api/v1/alm/gap-report/:id/approve', () => HttpResponse.json(wrap({ ...mockGapReport, status: 'FINAL', approvedBy: 'admin' }))),
    http.get('/api/v1/alm-full/:date/:currency', () => HttpResponse.json(wrap(opts?.positions ?? mockPositions))),
    http.get('/api/v1/alm/duration/:portfolioCode', () => HttpResponse.json(wrap(opts?.duration ?? mockDuration))),
    http.get('/api/v1/alm/scenarios', () => HttpResponse.json(wrap(opts?.scenarios ?? mockScenarios))),
    http.get('/api/v1/alm/scenarios/regulatory', () => HttpResponse.json(wrap(opts?.regScenarios ?? [mockScenarios[0]]))),
  );
}

describe('AlmDashboardPage', () => {
  it('renders page header and KPI stat cards', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    expect(screen.getByText('Asset-Liability Management')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Duration Gap')).toBeInTheDocument();
    });
    expect(screen.getByText('NII Sensitivity')).toBeInTheDocument();
    expect(screen.getByText('Active Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Cumulative Gap')).toBeInTheDocument();
  });

  it('renders Gap Report tab by default with generate form', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Generate New Gap Report')).toBeInTheDocument();
    });
    expect(screen.getByText('Report Date')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Total RSA')).toBeInTheDocument();
    expect(screen.getByText('Total RSL')).toBeInTheDocument();
  });

  it('displays gap report data when loaded', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('NII Base')).toBeInTheDocument();
    });
    expect(screen.getByText('NII +100bp')).toBeInTheDocument();
    // NII Sensitivity appears both as stat card and report metric — use getAllByText
    expect(screen.getAllByText('NII Sensitivity').length).toBeGreaterThanOrEqual(1);
  });

  it('shows approve button for DRAFT reports', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });
  });

  it('hides approve button for FINAL reports', async () => {
    setupHandlers({ reports: [{ ...mockGapReport, status: 'FINAL' }] });
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('NII Base')).toBeInTheDocument();
    });
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('shows ALCO Pack export button', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('ALCO Pack')).toBeInTheDocument();
    });
  });

  it('generates a gap report on form submit', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Generate'));
    // After mutation completes, the form should return to idle state
    await waitFor(() => {
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });
  });

  it('navigates to Duration Metrics tab and displays data', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlmDashboardPage />);
    await user.click(screen.getByText('Duration Metrics'));
    await waitFor(() => {
      expect(screen.getByText(/Portfolio Duration Metrics/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Macaulay Duration (Assets)')).toBeInTheDocument();
    });
    expect(screen.getByText('Modified Duration (Assets)')).toBeInTheDocument();
    expect(screen.getByText('DV01')).toBeInTheDocument();
  });

  it('navigates to Scenarios tab and displays active scenarios', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlmDashboardPage />);
    await user.click(screen.getByText('Scenarios'));
    await waitFor(() => {
      // "Active Scenarios" appears as stat card and as table header — use getAllByText
      expect(screen.getAllByText('Active Scenarios').length).toBeGreaterThanOrEqual(1);
    });
    await waitFor(() => {
      // Parallel +200 appears in both active and regulatory tables
      expect(screen.getAllByText('Parallel +200').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Steepening')).toBeInTheDocument();
  });

  it('navigates to Report History tab and displays all reports', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlmDashboardPage />);
    await user.click(screen.getByText('Report History'));
    await waitFor(() => {
      expect(screen.getByText('Report Date')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('NGN')).toBeInTheDocument();
    });
  });

  it('shows empty state when no gap reports exist', async () => {
    setupHandlers({ reports: [] });
    const user = userEvent.setup();
    renderWithProviders(<AlmDashboardPage />);
    await user.click(screen.getByText('Report History'));
    await waitFor(() => {
      expect(screen.getByText(/No gap reports on record/)).toBeInTheDocument();
    });
  });

  it('shows sensitivity heat map', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('NII & EVE Sensitivity Heat Map')).toBeInTheDocument();
    });
  });

  it('shows repricing ladder position snapshot', async () => {
    setupHandlers();
    renderWithProviders(<AlmDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Repricing Ladder — Position Snapshot/)).toBeInTheDocument();
    });
  });
});
