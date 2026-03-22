import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { LoanAnalyticsPage } from '../pages/LoanAnalyticsPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ── Mock Data (Nigerian banking context) ─────────────────────────────────────

const MOCK_STATS = {
  totalPortfolio: 2_450_000_000_000,
  nplAmount: 98_000_000_000,
  nplRatio: 4.0,
  provisionCoverage: 92.5,
  totalProvisions: 90_650_000_000,
};

const MOCK_PRODUCT_MIX = [
  { productName: 'Term Loans', count: 12500, amount: 980_000_000_000, nplPct: 3.2, avgRate: 22.5, avgTenorMonths: 36 },
  { productName: 'Overdrafts', count: 8400, amount: 420_000_000_000, nplPct: 5.1, avgRate: 24.0, avgTenorMonths: 12 },
  { productName: 'Asset Finance', count: 3200, amount: 350_000_000_000, nplPct: 2.8, avgRate: 20.0, avgTenorMonths: 60 },
  { productName: 'Trade Finance', count: 2100, amount: 280_000_000_000, nplPct: 1.5, avgRate: 18.5, avgTenorMonths: 6 },
  { productName: 'Mortgage Loans', count: 1800, amount: 220_000_000_000, nplPct: 4.6, avgRate: 16.0, avgTenorMonths: 240 },
];

const MOCK_SECTOR_EXPOSURE = [
  { sector: 'Oil & Gas', exposure: 520_000_000_000, percentage: 21.2, nplPct: 3.8 },
  { sector: 'Agriculture', exposure: 310_000_000_000, percentage: 12.7, nplPct: 6.2 },
  { sector: 'Manufacturing', exposure: 290_000_000_000, percentage: 11.8, nplPct: 4.1 },
  { sector: 'Real Estate', exposure: 250_000_000_000, percentage: 10.2, nplPct: 5.5 },
  { sector: 'Telecoms', exposure: 180_000_000_000, percentage: 7.3, nplPct: 1.9 },
];

const MOCK_DPD_BUCKETS = [
  { bucket: 'CURRENT', count: 22000, amount: 2_105_000_000_000, percentage: 85.9, provision: 21_050_000_000, coveragePct: 1.0 },
  { bucket: '1-30', count: 1800, amount: 147_000_000_000, percentage: 6.0, provision: 7_350_000_000, coveragePct: 5.0 },
  { bucket: '31-60', count: 900, amount: 73_500_000_000, percentage: 3.0, provision: 7_350_000_000, coveragePct: 10.0 },
  { bucket: '61-90', count: 600, amount: 49_000_000_000, percentage: 2.0, provision: 12_250_000_000, coveragePct: 25.0 },
  { bucket: '91-180', count: 400, amount: 49_000_000_000, percentage: 2.0, provision: 24_500_000_000, coveragePct: 50.0 },
  { bucket: '180+', count: 300, amount: 26_500_000_000, percentage: 1.1, provision: 26_500_000_000, coveragePct: 100.0 },
];

const MOCK_DPD_MATRIX = [
  {
    product: 'Term Loans',
    current: { count: 10000, amount: 850_000_000_000 },
    dpd1_30: { count: 800, amount: 50_000_000_000 },
    dpd31_60: { count: 400, amount: 30_000_000_000 },
    dpd61_90: { count: 200, amount: 20_000_000_000 },
    dpd91_180: { count: 150, amount: 18_000_000_000 },
    dpd180plus: { count: 100, amount: 12_000_000_000 },
  },
  {
    product: 'Overdrafts',
    current: { count: 7000, amount: 350_000_000_000 },
    dpd1_30: { count: 500, amount: 30_000_000_000 },
    dpd31_60: { count: 300, amount: 18_000_000_000 },
    dpd61_90: { count: 200, amount: 12_000_000_000 },
    dpd91_180: { count: 100, amount: 6_000_000_000 },
    dpd180plus: { count: 50, amount: 4_000_000_000 },
  },
];

const MOCK_NPL_TREND = [
  { month: '2025-04', nplAmount: 85_000_000_000, nplRatio: 3.6 },
  { month: '2025-05', nplAmount: 87_000_000_000, nplRatio: 3.7 },
  { month: '2025-06', nplAmount: 90_000_000_000, nplRatio: 3.8 },
  { month: '2025-07', nplAmount: 88_000_000_000, nplRatio: 3.7 },
  { month: '2025-08', nplAmount: 92_000_000_000, nplRatio: 3.9 },
  { month: '2025-09', nplAmount: 95_000_000_000, nplRatio: 3.9 },
  { month: '2025-10', nplAmount: 93_000_000_000, nplRatio: 3.8 },
  { month: '2025-11', nplAmount: 96_000_000_000, nplRatio: 3.9 },
  { month: '2025-12', nplAmount: 94_000_000_000, nplRatio: 3.8 },
  { month: '2026-01', nplAmount: 97_000_000_000, nplRatio: 4.0 },
  { month: '2026-02', nplAmount: 98_000_000_000, nplRatio: 4.0 },
];

const MOCK_PROVISION_WATERFALL = {
  opening: 82_000_000_000,
  charge: 15_000_000_000,
  release: 3_500_000_000,
  writeOff: 2_850_000_000,
  closing: 90_650_000_000,
};

const MOCK_TOP_OBLIGORS = [
  { customerName: 'Dangote Industries Ltd', sector: 'Manufacturing', exposure: 45_000_000_000, percentage: 1.84, delinquencyBucket: 'CURRENT' },
  { customerName: 'Nigerian National Petroleum Corp', sector: 'Oil & Gas', exposure: 38_000_000_000, percentage: 1.55, delinquencyBucket: 'CURRENT' },
  { customerName: 'BUA Cement Plc', sector: 'Manufacturing', exposure: 32_000_000_000, percentage: 1.31, delinquencyBucket: 'CURRENT' },
  { customerName: 'MTN Nigeria Comms Plc', sector: 'Telecoms', exposure: 28_000_000_000, percentage: 1.14, delinquencyBucket: 'CURRENT' },
  { customerName: 'Flour Mills of Nigeria Plc', sector: 'Agriculture', exposure: 25_000_000_000, percentage: 1.02, delinquencyBucket: '1-30' },
];

const MOCK_VINTAGE = [
  { vintage: 'Q1-2025', month: 'M1', defaultRate: 0.2 },
  { vintage: 'Q1-2025', month: 'M2', defaultRate: 0.5 },
  { vintage: 'Q1-2025', month: 'M3', defaultRate: 0.9 },
  { vintage: 'Q2-2025', month: 'M1', defaultRate: 0.3 },
  { vintage: 'Q2-2025', month: 'M2', defaultRate: 0.7 },
  { vintage: 'Q2-2025', month: 'M3', defaultRate: 1.1 },
];

const MOCK_VINTAGE_MATRIX = [
  { vintage: 'Q1-2025', month: 1, defaultRate: 0.2, lossRate: 0.05, count: 3000, amount: 150_000_000_000 },
  { vintage: 'Q1-2025', month: 2, defaultRate: 0.5, lossRate: 0.12, count: 2980, amount: 148_000_000_000 },
  { vintage: 'Q1-2025', month: 3, defaultRate: 0.9, lossRate: 0.22, count: 2950, amount: 145_000_000_000 },
  { vintage: 'Q2-2025', month: 1, defaultRate: 0.3, lossRate: 0.08, count: 3200, amount: 160_000_000_000 },
  { vintage: 'Q2-2025', month: 2, defaultRate: 0.7, lossRate: 0.18, count: 3150, amount: 157_000_000_000 },
];

const MOCK_GEOGRAPHIC = [
  { region: 'Lagos', exposure: 680_000_000_000, percentage: 27.8 },
  { region: 'Abuja (FCT)', exposure: 420_000_000_000, percentage: 17.1 },
  { region: 'Rivers', exposure: 310_000_000_000, percentage: 12.7 },
  { region: 'Kano', exposure: 180_000_000_000, percentage: 7.3 },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/loans/stats', () => HttpResponse.json(wrap(MOCK_STATS))),
    http.get('/api/v1/reports/loans/product-mix', () => HttpResponse.json(wrap(MOCK_PRODUCT_MIX))),
    http.get('/api/v1/reports/loans/sector-exposure', () => HttpResponse.json(wrap(MOCK_SECTOR_EXPOSURE))),
    http.get('/api/v1/reports/loans/dpd-buckets', () => HttpResponse.json(wrap(MOCK_DPD_BUCKETS))),
    http.get('/api/v1/reports/loans/dpd-matrix', () => HttpResponse.json(wrap(MOCK_DPD_MATRIX))),
    http.get('/api/v1/reports/loans/npl-trend', () => HttpResponse.json(wrap(MOCK_NPL_TREND))),
    http.get('/api/v1/reports/loans/provision-waterfall', () => HttpResponse.json(wrap(MOCK_PROVISION_WATERFALL))),
    http.get('/api/v1/reports/loans/top-obligors', () => HttpResponse.json(wrap(MOCK_TOP_OBLIGORS))),
    http.get('/api/v1/reports/loans/vintage', () => HttpResponse.json(wrap(MOCK_VINTAGE))),
    http.get('/api/v1/reports/loans/vintage-matrix', () => HttpResponse.json(wrap(MOCK_VINTAGE_MATRIX))),
    http.get('/api/v1/reports/loans/geographic-concentration', () => HttpResponse.json(wrap(MOCK_GEOGRAPHIC))),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoanAnalyticsPage', () => {
  it('renders page title "Loan Portfolio Analytics"', () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    expect(screen.getByText('Loan Portfolio Analytics')).toBeInTheDocument();
  });

  it('displays loan portfolio stats cards after data loads', async () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Performing')).toBeInTheDocument();
      expect(screen.getByText('NPL')).toBeInTheDocument();
      expect(screen.getAllByText('Provision').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Coverage Ratio')).toBeInTheDocument();
    });
  });

  it('renders DPD heatmap matrix section', async () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('DPD Heatmap Matrix')).toBeInTheDocument();
    });
  });

  it('displays DPD matrix product rows', async () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Term Loans').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Overdrafts').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders sector concentration data in concentration dashboard', async () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Concentration Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sector Exposure')).toBeInTheDocument();
    });
  });

  it('renders top obligors table with obligor names', async () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Top 20 Obligors')).toBeInTheDocument();
      expect(screen.getByText('Dangote Industries Ltd')).toBeInTheDocument();
      expect(screen.getByText('Nigerian National Petroleum Corp')).toBeInTheDocument();
    });
  });

  it('renders vintage section controls', async () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Vintage source:')).toBeInTheDocument();
    });
    expect(screen.getByText('Simple')).toBeInTheDocument();
    expect(screen.getByText('Full Matrix')).toBeInTheDocument();
  });

  it('displays period selector buttons', () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    expect(screen.getByText('Feb 2026')).toBeInTheDocument();
    expect(screen.getByText('Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('Dec 2025')).toBeInTheDocument();
    expect(screen.getByText('Q4 2025')).toBeInTheDocument();
    expect(screen.getByText('Q3 2025')).toBeInTheDocument();
    expect(screen.getByText('YTD 2026')).toBeInTheDocument();
  });

  it('displays Refresh button', () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument();
  });

  it('displays Export button', () => {
    setupHandlers();
    renderWithProviders(<LoanAnalyticsPage />);
    expect(screen.getByRole('button', { name: /export report/i })).toBeInTheDocument();
  });
});
