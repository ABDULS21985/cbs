import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ExecutiveDashboardPage } from '../pages/ExecutiveDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockKpis = {
  totalDeposits: 5_200_000_000,
  totalLoans: 3_800_000_000,
  totalCustomers: 142_500,
  totalRevenue: 720_000_000,
  nplRatio: 3.25,
  costToIncomeRatio: 52.8,
  priorPeriodRevenue: 680_000_000,
  changePercent: 5.88,
  changeDirection: 'UP',
};

const mockPnlSummary = {
  interestIncome: 480_000_000,
  interestExpense: 180_000_000,
  netInterestIncome: 300_000_000,
  feeCommission: 95_000_000,
  tradingIncome: 45_000_000,
  otherIncome: 15_000_000,
  totalRevenue: 455_000_000,
  opex: 240_000_000,
  provisions: 35_000_000,
  pbt: 180_000_000,
  tax: 54_000_000,
  netProfit: 126_000_000,
  nim: 6.2,
  costToIncome: 52.7,
  roe: 18.4,
};

const mockMonthlyPnl = [
  { month: 'Jan', interestIncome: 40_000_000, feeIncome: 8_000_000, tradingIncome: 3_500_000, opex: 20_000_000, netProfit: 10_500_000 },
  { month: 'Feb', interestIncome: 41_000_000, feeIncome: 7_500_000, tradingIncome: 4_000_000, opex: 20_200_000, netProfit: 11_000_000 },
  { month: 'Mar', interestIncome: 42_000_000, feeIncome: 8_200_000, tradingIncome: 3_800_000, opex: 20_500_000, netProfit: 11_200_000 },
];

const mockKeyRatios = [
  { label: 'Capital Adequacy', value: 16.5, formatted: '16.5%', target: 15.0, targetLabel: 'Min 15%', targetType: 'MIN' as const, met: true, peerAvg: 15.2, barFill: 82 },
  { label: 'Liquidity Coverage', value: 145.0, formatted: '145%', target: 100.0, targetLabel: 'Min 100%', targetType: 'MIN' as const, met: true, barFill: 90 },
];

const mockCustomerGrowth = [
  { month: 'Jan', newCustomers: 1200, closedCustomers: 150, netGrowth: 1050, totalCustomers: 140_000 },
  { month: 'Feb', newCustomers: 1350, closedCustomers: 180, netGrowth: 1170, totalCustomers: 141_170 },
];

const mockDepositLoanGrowth = [
  { month: 'Jan', deposits: 5_000_000_000, loans: 3_700_000_000 },
  { month: 'Feb', deposits: 5_100_000_000, loans: 3_750_000_000 },
];

const mockTopBranches = [
  { rank: 1, branch: 'Victoria Island', deposits: 820_000_000, loans: 450_000_000, revenue: 95_000_000, customers: 12_500, efficiencyRatio: 42.3 },
  { rank: 2, branch: 'Ikoyi', deposits: 680_000_000, loans: 380_000_000, revenue: 78_000_000, customers: 9_800, efficiencyRatio: 45.1 },
  { rank: 3, branch: 'Lekki', deposits: 550_000_000, loans: 320_000_000, revenue: 65_000_000, customers: 8_200, efficiencyRatio: 47.8 },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/executive/kpis', () => HttpResponse.json(wrap(mockKpis))),
    http.get('/api/v1/reports/executive/pnl-summary', () => HttpResponse.json(wrap(mockPnlSummary))),
    http.get('/api/v1/reports/executive/monthly-pnl', () => HttpResponse.json(wrap(mockMonthlyPnl))),
    http.get('/api/v1/reports/executive/key-ratios', () => HttpResponse.json(wrap(mockKeyRatios))),
    http.get('/api/v1/reports/executive/customer-growth', () => HttpResponse.json(wrap(mockCustomerGrowth))),
    http.get('/api/v1/reports/executive/deposit-loan-growth', () => HttpResponse.json(wrap(mockDepositLoanGrowth))),
    http.get('/api/v1/reports/executive/top-branches', () => HttpResponse.json(wrap(mockTopBranches))),
  );
}

describe('ExecutiveDashboardPage', () => {
  it('renders the page title', () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    expect(screen.getByText('Executive Dashboard')).toBeInTheDocument();
  });

  it('displays KPI cards after data loads', async () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Deposits')).toBeInTheDocument();
    });
    expect(screen.getByText('Gross Loans')).toBeInTheDocument();
    expect(screen.getByText('Customer Count')).toBeInTheDocument();
    expect(screen.getAllByText('Total Revenue').length).toBeGreaterThanOrEqual(1);
  });

  it('shows P&L waterfall chart section', async () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('P&L Waterfall')).toBeInTheDocument();
    });
  });

  it('shows Top Branches table section', async () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Branch Performance')).toBeInTheDocument();
    });
  });

  it('period toggle buttons are present', () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    expect(screen.getByText('MTD')).toBeInTheDocument();
    expect(screen.getByText('QTD')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
  });

  it('export suite is present', () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    expect(screen.getByLabelText('Export report')).toBeInTheDocument();
  });

  it('renders the NPL Ratio and Cost-to-Income KPI cards', async () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('NPL Ratio')).toBeInTheDocument();
    });
    expect(screen.getByText('Cost-to-Income')).toBeInTheDocument();
  });

  it('shows the period label subtitle', () => {
    setupHandlers();
    renderWithProviders(<ExecutiveDashboardPage />);
    expect(screen.getByText(/Year-to-Date FY2025\/26/)).toBeInTheDocument();
  });
});
