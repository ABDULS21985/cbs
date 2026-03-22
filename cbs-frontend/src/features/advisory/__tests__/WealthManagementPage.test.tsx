import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { WealthManagementPage } from '../pages/WealthManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockPlans = [
  {
    id: 1, planCode: 'WMP-001', customerId: '101', customerName: 'John Doe',
    planType: 'COMPREHENSIVE', advisorId: 'ADV-001', advisorName: 'Advisor ADV-001',
    totalNetWorth: 10000000, totalInvestableAssets: 5000000, annualIncome: 1200000,
    riskProfile: 'MODERATE', investmentHorizon: 15,
    targetAllocation: { equities: 40, bonds: 30, alternatives: 20, cash: 10 },
    currentAllocation: { equities: 38, bonds: 32, alternatives: 18, cash: 12 },
    goals: [], financialGoals: [{ name: 'Retirement', targetAmount: 20000000 }],
    nextReviewDate: '2026-06-01', createdDate: '2025-01-15',
    activatedDate: '2025-01-20', lastReviewDate: '2025-01-15',
    status: 'ACTIVE', ytdReturn: 12.5, absoluteGain: 625000, benchmarkDiff: 4.3,
  },
  {
    id: 2, planCode: 'WMP-002', customerId: '102', customerName: 'Jane Smith',
    planType: 'RETIREMENT', advisorId: null, advisorName: null,
    totalNetWorth: 3000000, totalInvestableAssets: 1500000, annualIncome: 500000,
    riskProfile: 'CONSERVATIVE', investmentHorizon: 25,
    targetAllocation: {}, currentAllocation: {},
    goals: [], financialGoals: [],
    nextReviewDate: null, createdDate: '2025-03-01',
    activatedDate: null, lastReviewDate: null,
    status: 'DRAFT', ytdReturn: 0, absoluteGain: 0, benchmarkDiff: 0,
  },
];

const mockAdvisors = [
  {
    id: 1, advisorCode: 'ADV-001', fullName: 'Jane Advisor',
    email: 'jane@cbs.ng', phone: '+234-800-000-0000',
    specializations: ['Wealth Planning'], certifications: [],
    maxClients: 30, managementFeePct: 0.0125, advisoryFeePct: 0.0075,
    performanceFeePct: 0.002, joinDate: '2020-01-15', status: 'ACTIVE',
  },
];

const mockAumTrend = [
  { month: '2025-01-01', aum: 4500000, returns: 8.5 },
  { month: '2025-02-01', aum: 4800000, returns: 10.2 },
  { month: '2025-03-01', aum: 5000000, returns: 12.5 },
];

const mockInsights = [
  {
    type: 'WARNING', severity: 'HIGH', title: 'Unassigned Plans',
    description: '1 plan(s) have no assigned wealth advisor.',
    metric: 1, recommendation: 'Assign advisors to orphaned plans.',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/wealth-management', () => HttpResponse.json(wrap(mockPlans))),
    http.get('/api/v1/wealth-management/advisors', () => HttpResponse.json(wrap(mockAdvisors))),
    http.get('/api/v1/wealth-management/analytics/aum-trend', () => HttpResponse.json(wrap(mockAumTrend))),
    http.get('/api/v1/wealth-management/analytics/aum-by-segment', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/concentration-risk', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/flow-analysis', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/performance-attribution', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/risk-heatmap', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/stress-scenarios', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/fee-revenue', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/wealth-management/analytics/insights', () => HttpResponse.json(wrap(mockInsights))),
    http.post('/api/v1/wealth-management', () => HttpResponse.json(wrap({
      ...mockPlans[0], id: 3, planCode: 'WMP-003',
    }))),
    http.post('/api/v1/wealth-management/:code/activate', () => HttpResponse.json(wrap({
      ...mockPlans[1], status: 'ACTIVE',
    }))),
    http.post('/api/v1/wealth-management/:code/close', () => HttpResponse.json(wrap({
      ...mockPlans[0], status: 'CLOSED',
    }))),
    http.post('/api/v1/wealth-management/:code/assign-advisor', () => HttpResponse.json(wrap(mockPlans[0]))),
    http.post('/api/v1/wealth-management/:code/goals', () => HttpResponse.json(wrap(mockPlans[0]))),
    http.post('/api/v1/wealth-management/:code/rebalance', () => HttpResponse.json(wrap({
      planCode: 'WMP-001', message: 'Rebalance initiated', status: 'COMPLETED',
    }))),
    http.post('/api/v1/wealth-management/advisors', () => HttpResponse.json(wrap({
      id: 2, advisorCode: 'ADV-002', fullName: 'New Advisor', email: 'new@cbs.ng', status: 'ACTIVE',
    }))),
  );
}

describe('WealthManagementPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    expect(screen.getByText('Wealth Management')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    expect(screen.getByText('Plans')).toBeInTheDocument();
    expect(screen.getByText('Advisors')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  // ─── Plans Tab ──────────────────────────────────────────────────────────────

  it('loads and displays plans', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('WMP-001')).toBeInTheDocument();
    });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('WMP-002')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders stat cards on plans tab', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Plans')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Plans')).toBeInTheDocument();
    expect(screen.getByText('Total AUM')).toBeInTheDocument();
    expect(screen.getByText('Draft Plans')).toBeInTheDocument();
  });

  it('opens create plan dialog', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('New Plan')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('New Plan'));
    await waitFor(() => {
      expect(screen.getByText('New Wealth Management Plan')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer ID *')).toBeInTheDocument();
    expect(screen.getByText('Plan Type *')).toBeInTheDocument();
  });

  it('shows row actions with activate for draft plans', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('WMP-002')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });

  it('shows add goal and assign advisor actions', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('WMP-001')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Add Goal')).toBeInTheDocument();
    });
    expect(screen.getByText('Assign Advisor')).toBeInTheDocument();
    expect(screen.getByText('Rebalance')).toBeInTheDocument();
    expect(screen.getByText('Close Plan')).toBeInTheDocument();
  });

  it('filters plans by status', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('WMP-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(statusSelect, { target: { value: 'DRAFT' } });

    await waitFor(() => {
      expect(screen.queryByText('WMP-001')).not.toBeInTheDocument();
      expect(screen.getByText('WMP-002')).toBeInTheDocument();
    });
  });

  // ─── Advisors Tab ───────────────────────────────────────────────────────────

  it('shows advisor data in advisors tab', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    fireEvent.click(screen.getByText('Advisors'));
    await waitFor(() => {
      expect(screen.getByText('ADV-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Advisor')).toBeInTheDocument();
  });

  it('opens new advisor dialog', async () => {
    setupHandlers();
    renderWithProviders(<WealthManagementPage />);
    fireEvent.click(screen.getByText('Advisors'));
    await waitFor(() => {
      expect(screen.getByText('New Advisor')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('New Advisor'));
    await waitFor(() => {
      expect(screen.getByText('Register New Advisor')).toBeInTheDocument();
    });
  });
});
