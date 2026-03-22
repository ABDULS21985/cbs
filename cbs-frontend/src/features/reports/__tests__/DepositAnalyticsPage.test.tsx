import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { DepositAnalyticsPage } from '../pages/DepositAnalyticsPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ── Mock Data (Nigerian banking context — NGN) ───────────────────────────────

const MOCK_STATS = {
  total: 3_850_000_000_000,
  savings: 1_540_000_000_000,
  current: 1_155_000_000_000,
  term: 1_155_000_000_000,
  costOfFunds: 4.25,
  avgDeposit: 2_450_000,
  newDepositsMTD: 82_000_000_000,
  retentionRate: 91.3,
};

const MOCK_MIX = [
  { name: 'Savings', amount: 1_540_000_000_000, pct: 40.0, color: '#3b82f6' },
  { name: 'Current', amount: 1_155_000_000_000, pct: 30.0, color: '#8b5cf6' },
  { name: 'Term (Fixed)', amount: 770_000_000_000, pct: 20.0, color: '#10b981' },
  { name: 'Term (Call)', amount: 385_000_000_000, pct: 10.0, color: '#f59e0b' },
];

const MOCK_GROWTH_TREND = [
  { month: '2025-04', savings: 1_420_000_000_000, current: 1_080_000_000_000, term: 1_050_000_000_000, total: 3_550_000_000_000 },
  { month: '2025-05', savings: 1_435_000_000_000, current: 1_090_000_000_000, term: 1_060_000_000_000, total: 3_585_000_000_000 },
  { month: '2025-06', savings: 1_450_000_000_000, current: 1_095_000_000_000, term: 1_075_000_000_000, total: 3_620_000_000_000 },
  { month: '2025-07', savings: 1_460_000_000_000, current: 1_100_000_000_000, term: 1_080_000_000_000, total: 3_640_000_000_000 },
  { month: '2025-08', savings: 1_475_000_000_000, current: 1_110_000_000_000, term: 1_090_000_000_000, total: 3_675_000_000_000 },
  { month: '2025-09', savings: 1_490_000_000_000, current: 1_115_000_000_000, term: 1_095_000_000_000, total: 3_700_000_000_000 },
  { month: '2025-10', savings: 1_500_000_000_000, current: 1_120_000_000_000, term: 1_105_000_000_000, total: 3_725_000_000_000 },
  { month: '2025-11', savings: 1_510_000_000_000, current: 1_130_000_000_000, term: 1_120_000_000_000, total: 3_760_000_000_000 },
  { month: '2025-12', savings: 1_520_000_000_000, current: 1_140_000_000_000, term: 1_135_000_000_000, total: 3_795_000_000_000 },
  { month: '2026-01', savings: 1_530_000_000_000, current: 1_145_000_000_000, term: 1_140_000_000_000, total: 3_815_000_000_000 },
  { month: '2026-02', savings: 1_535_000_000_000, current: 1_150_000_000_000, term: 1_150_000_000_000, total: 3_835_000_000_000 },
  { month: '2026-03', savings: 1_540_000_000_000, current: 1_155_000_000_000, term: 1_155_000_000_000, total: 3_850_000_000_000 },
];

const MOCK_TOP_DEPOSITORS = [
  { rank: 1, name: 'Federal Ministry of Finance', segment: 'GOVERNMENT', amount: 185_000_000_000, pct: 4.81, type: 'Current', riskFlag: true },
  { rank: 2, name: 'NNPC Ltd', segment: 'CORPORATE', amount: 142_000_000_000, pct: 3.69, type: 'Current', riskFlag: true },
  { rank: 3, name: 'Lagos State Government', segment: 'GOVERNMENT', amount: 98_000_000_000, pct: 2.55, type: 'Current', riskFlag: false },
  { rank: 4, name: 'Dangote Group', segment: 'CORPORATE', amount: 76_000_000_000, pct: 1.97, type: 'Term', riskFlag: false },
  { rank: 5, name: 'MTN Nigeria', segment: 'CORPORATE', amount: 65_000_000_000, pct: 1.69, type: 'Current', riskFlag: false },
];

const MOCK_MATURITY_PROFILE = [
  { month: '2026-04', amount: 95_000_000_000, count: 3200, avgRate: 12.5, avgTenor: 90, rolloverPct: 78 },
  { month: '2026-05', amount: 82_000_000_000, count: 2800, avgRate: 13.0, avgTenor: 120, rolloverPct: 72 },
  { month: '2026-06', amount: 110_000_000_000, count: 4100, avgRate: 11.8, avgTenor: 180, rolloverPct: 85 },
  { month: '2026-07', amount: 68_000_000_000, count: 2200, avgRate: 14.2, avgTenor: 90, rolloverPct: 65 },
  { month: '2026-08', amount: 73_000_000_000, count: 2500, avgRate: 13.5, avgTenor: 150, rolloverPct: 70 },
  { month: '2026-09', amount: 125_000_000_000, count: 4800, avgRate: 12.0, avgTenor: 365, rolloverPct: 88 },
];

const MOCK_RATE_BANDS = [
  { band: '0-5%', amount: 1_540_000_000_000, count: 450000, pct: 40.0, color: '#10b981' },
  { band: '5-10%', amount: 770_000_000_000, count: 120000, pct: 20.0, color: '#3b82f6' },
  { band: '10-15%', amount: 962_500_000_000, count: 85000, pct: 25.0, color: '#f59e0b' },
  { band: '15%+', amount: 577_500_000_000, count: 45000, pct: 15.0, color: '#ef4444' },
];

const MOCK_RATE_SENSITIVITY = [
  { amount: 500_000_000, rate: 12.5, segment: 'CORPORATE' },
  { amount: 2_000_000, rate: 4.0, segment: 'RETAIL' },
  { amount: 150_000_000, rate: 8.5, segment: 'SME' },
  { amount: 1_200_000_000, rate: 14.0, segment: 'CORPORATE' },
  { amount: 5_000_000, rate: 3.5, segment: 'RETAIL' },
];

const MOCK_COST_OF_FUNDS = [
  { month: '2025-04', savings: 2.1, current: 0.5, term: 10.2, overall: 3.8, mpr: 18.75 },
  { month: '2025-05', savings: 2.1, current: 0.5, term: 10.5, overall: 3.9, mpr: 18.75 },
  { month: '2025-06', savings: 2.2, current: 0.5, term: 10.8, overall: 4.0, mpr: 18.75 },
  { month: '2025-07', savings: 2.2, current: 0.5, term: 11.0, overall: 4.1, mpr: 19.00 },
  { month: '2025-08', savings: 2.3, current: 0.5, term: 11.2, overall: 4.1, mpr: 19.00 },
  { month: '2025-09', savings: 2.3, current: 0.5, term: 11.0, overall: 4.1, mpr: 19.00 },
  { month: '2025-10', savings: 2.4, current: 0.5, term: 10.8, overall: 4.1, mpr: 19.50 },
  { month: '2025-11', savings: 2.4, current: 0.5, term: 10.5, overall: 4.1, mpr: 19.50 },
  { month: '2025-12', savings: 2.5, current: 0.5, term: 10.3, overall: 4.2, mpr: 19.50 },
  { month: '2026-01', savings: 2.5, current: 0.5, term: 10.5, overall: 4.2, mpr: 20.00 },
  { month: '2026-02', savings: 2.5, current: 0.5, term: 10.6, overall: 4.2, mpr: 20.00 },
  { month: '2026-03', savings: 2.6, current: 0.5, term: 10.8, overall: 4.25, mpr: 20.00 },
];

const MOCK_RETENTION_VINTAGE = [
  { vintage: 'Q1-2025', month: 'M3', retentionRate: 95.2 },
  { vintage: 'Q1-2025', month: 'M6', retentionRate: 91.8 },
  { vintage: 'Q1-2025', month: 'M9', retentionRate: 88.4 },
  { vintage: 'Q1-2025', month: 'M12', retentionRate: 85.1 },
  { vintage: 'Q2-2025', month: 'M3', retentionRate: 94.8 },
  { vintage: 'Q2-2025', month: 'M6', retentionRate: 90.5 },
  { vintage: 'Q2-2025', month: 'M9', retentionRate: 87.2 },
  { vintage: 'Q3-2025', month: 'M3', retentionRate: 96.1 },
  { vintage: 'Q3-2025', month: 'M6', retentionRate: 92.3 },
];

const MOCK_CHURN = {
  avgTenureMonths: 34,
  totalClosed: 12500,
  reasons: [
    { reason: 'Better rates elsewhere', count: 4200, pct: 33.6 },
    { reason: 'Relocation', count: 2800, pct: 22.4 },
    { reason: 'Account inactivity', count: 2500, pct: 20.0 },
    { reason: 'Poor service', count: 1800, pct: 14.4 },
    { reason: 'Other', count: 1200, pct: 9.6 },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/deposits/stats', () => HttpResponse.json(wrap(MOCK_STATS))),
    http.get('/api/v1/reports/deposits/mix', () => HttpResponse.json(wrap(MOCK_MIX))),
    http.get('/api/v1/reports/deposits/growth-trend', () => HttpResponse.json(wrap(MOCK_GROWTH_TREND))),
    http.get('/api/v1/reports/deposits/top-depositors', () => HttpResponse.json(wrap(MOCK_TOP_DEPOSITORS))),
    http.get('/api/v1/reports/deposits/maturity-profile', () => HttpResponse.json(wrap(MOCK_MATURITY_PROFILE))),
    http.get('/api/v1/reports/deposits/rate-bands', () => HttpResponse.json(wrap(MOCK_RATE_BANDS))),
    http.get('/api/v1/reports/deposits/rate-sensitivity', () => HttpResponse.json(wrap(MOCK_RATE_SENSITIVITY))),
    http.get('/api/v1/reports/deposits/cost-of-funds', () => HttpResponse.json(wrap(MOCK_COST_OF_FUNDS))),
    http.get('/api/v1/reports/deposits/retention-vintage', () => HttpResponse.json(wrap(MOCK_RETENTION_VINTAGE))),
    http.get('/api/v1/reports/deposits/churn', () => HttpResponse.json(wrap(MOCK_CHURN))),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DepositAnalyticsPage', () => {
  it('renders page title "Deposit Analytics"', () => {
    setupHandlers();
    renderWithProviders(<DepositAnalyticsPage />);
    expect(screen.getByText('Deposit Analytics')).toBeInTheDocument();
  });

  it('displays deposit stats cards after data loads', async () => {
    setupHandlers();
    renderWithProviders(<DepositAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Total Deposits').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Savings Deposits').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Current Accounts').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Term Deposits').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Cost of Funds').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Retention Rate').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders deposit mix visualization', async () => {
    setupHandlers();
    renderWithProviders(<DepositAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Deposit Mix')).toBeInTheDocument();
    });
  });

  it('renders top depositors table with depositor names', async () => {
    setupHandlers();
    renderWithProviders(<DepositAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Top 20 Depositors/)).toBeInTheDocument();
      expect(screen.getByText('Federal Ministry of Finance')).toBeInTheDocument();
      expect(screen.getByText('NNPC Ltd')).toBeInTheDocument();
    });
  });

  it('renders maturity profile chart section', async () => {
    setupHandlers();
    renderWithProviders(<DepositAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Term Deposit Maturity Profile/)).toBeInTheDocument();
    });
  });

  it('renders cost of funds trend section', async () => {
    setupHandlers();
    renderWithProviders(<DepositAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Cost of Funds Trend/)).toBeInTheDocument();
    });
  });
});
