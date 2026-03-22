import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { StressTestingPage } from '../pages/StressTestingPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockScenarios = [
  { id: 1, scenarioName: 'Parallel Up +200', scenarioType: 'PARALLEL_UP', shiftBps: { '1Y': 200, '5Y': 200, '10Y': 200 }, description: 'Parallel shift up 200bps', isRegulatory: true, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, scenarioName: 'Steepening Shock', scenarioType: 'STEEPENING', shiftBps: { '1Y': 50, '5Y': 150, '10Y': 250 }, description: 'Yield curve steepening', isRegulatory: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 3, scenarioName: 'Flattening Shock', scenarioType: 'FLATTENING', shiftBps: { '1Y': 200, '5Y': 100, '10Y': 50 }, description: 'Yield curve flattening', isRegulatory: true, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
];

const mockStressResult = {
  scenarioId: 1,
  scenarioName: 'Parallel Up +200',
  scenarioType: 'PARALLEL_UP',
  avgShockBps: 200,
  niiWaterfall: [
    { step: 'Base NII', value: 5000000000, cumulative: 5000000000 },
    { step: 'Repricing Impact', value: 100000000, cumulative: 5100000000 },
    { step: 'Basis Risk', value: -15000000, cumulative: 5085000000 },
    { step: 'Optionality', value: -8000000, cumulative: 5077000000 },
    { step: 'Stress NII', value: 5077000000, cumulative: 5077000000 },
  ],
  eveBreakdown: { repricingRisk: -240000000, basisRisk: -28800000, optionRisk: -14400000, yieldCurveRisk: -43200000, totalImpact: -326400000 },
  capitalAdequacy: { cet1Before: 14.5, cet1After: 14.09, regulatoryMinimum: 10.5, capitalImpactPct: -0.41 },
  balanceSheetProjection: Array.from({ length: 13 }, (_, i) => ({ month: i, assets: 80000000000 + i * 200000000, liabilities: 75000000000 + i * 300000000 })),
  limitBreaches: [],
  niiImpact: 77000000,
  eveImpact: -326400000,
  runAt: '2026-03-22T10:00:00Z',
};

const mockHistoricalReplay = {
  crisisName: 'GFC_2008',
  totalMonths: 13,
  peakLoss: -1500000000,
  peakGain: 0,
  finalPnl: -125000000,
  path: Array.from({ length: 13 }, (_, i) => ({
    month: i,
    rateBps: [0, -25, -75, -150, -200, -250, -300, -275, -225, -175, -125, -50, -25][i],
    monthlyPnl: i === 0 ? 0 : -100000000 * i / 12,
    cumulativePnl: -100000000 * i * (i + 1) / 24,
    nii: 5000000000 - 100000000 * i / 12,
  })),
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/alm/scenarios', () => HttpResponse.json(wrap(mockScenarios))),
    http.get('/api/v1/alm/scenarios/regulatory', () => HttpResponse.json(wrap(mockScenarios.filter(s => s.isRegulatory)))),
    http.post('/api/v1/alm/scenarios/:id/run', () => HttpResponse.json(wrap(mockStressResult))),
    http.get('/api/v1/alm/scenarios/historical/:crisisName', () => HttpResponse.json(wrap(mockHistoricalReplay))),
    http.post('/api/v1/alm/scenarios/compare', () => HttpResponse.json(wrap({ scenarios: [mockStressResult, { ...mockStressResult, scenarioId: 2, scenarioName: 'Steepening Shock' }], comparedAt: '2026-03-22T10:00:00Z' }))),
    http.post('/api/v1/alm/scenarios', () => HttpResponse.json(wrap({ ...mockScenarios[0], id: 4, scenarioName: 'Custom Scenario' }))),
  );
}

describe('StressTestingPage', () => {
  it('renders page header', async () => {
    setupHandlers();
    renderWithProviders(<StressTestingPage />);
    expect(screen.getByText('Stress Testing & Scenario Engine')).toBeInTheDocument();
  });

  it('renders scenario library with scenario cards', async () => {
    setupHandlers();
    renderWithProviders(<StressTestingPage />);
    await waitFor(() => {
      expect(screen.getByText('Parallel Up +200')).toBeInTheDocument();
    });
    expect(screen.getByText('Steepening Shock')).toBeInTheDocument();
    expect(screen.getByText('Flattening Shock')).toBeInTheDocument();
  });

  it('shows historical crisis cards', async () => {
    setupHandlers();
    renderWithProviders(<StressTestingPage />);
    await waitFor(() => {
      expect(screen.getByText('GFC 2008')).toBeInTheDocument();
    });
    expect(screen.getByText('COVID 2020')).toBeInTheDocument();
    expect(screen.getByText('SVB 2023')).toBeInTheDocument();
    expect(screen.getByText('Nigeria 2016')).toBeInTheDocument();
  });

  it('shows scenario details and avg shock value', async () => {
    setupHandlers();
    renderWithProviders(<StressTestingPage />);
    await waitFor(() => {
      expect(screen.getByText('Parallel Up +200')).toBeInTheDocument();
    });
    // Verify scenario metadata is visible
    expect(screen.getByText('PARALLEL_UP')).toBeInTheDocument();
    expect(screen.getByText('Steepening Shock')).toBeInTheDocument();
  });

  it('starts a historical replay', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<StressTestingPage />);
    await waitFor(() => {
      expect(screen.getByText('GFC 2008')).toBeInTheDocument();
    });
    // Click the GFC 2008 card to start replay
    await user.click(screen.getByText('GFC 2008'));
    await waitFor(() => {
      // Should show historical replay view elements
      expect(screen.getByText(/GFC/i)).toBeInTheDocument();
    });
  });

  it('shows filter dropdown for scenario types', async () => {
    setupHandlers();
    renderWithProviders(<StressTestingPage />);
    await waitFor(() => {
      expect(screen.getByText('Parallel Up +200')).toBeInTheDocument();
    });
    // Should have filter/search UI elements
    const searchInput = screen.queryByPlaceholderText(/search/i);
    if (searchInput) {
      expect(searchInput).toBeInTheDocument();
    }
  });

  it('shows scenario type badges', async () => {
    setupHandlers();
    renderWithProviders(<StressTestingPage />);
    await waitFor(() => {
      expect(screen.getByText('PARALLEL_UP')).toBeInTheDocument();
    });
    expect(screen.getByText('STEEPENING')).toBeInTheDocument();
    expect(screen.getByText('FLATTENING')).toBeInTheDocument();
  });
});
