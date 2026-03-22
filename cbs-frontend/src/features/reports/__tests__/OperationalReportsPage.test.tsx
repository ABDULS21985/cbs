import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { OperationalReportsPage } from '../pages/OperationalReportsPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  slaAchievementPct: 94.5,
  avgCaseResolutionHours: 4.2,
  staffUtilizationPct: 87.3,
  costPerTransaction: 12.5,
  downtimeHours: 1.8,
  automationRatePct: 68.2,
};

const MOCK_SLA = [
  { process: 'Account Opening', slaTargetHours: 24, actualHours: 18, achievementPct: 96.2, breaches: 3 },
  { process: 'Loan Disbursement', slaTargetHours: 48, actualHours: 42, achievementPct: 91.5, breaches: 8 },
];

const MOCK_SLA_TREND = [
  { month: '2026-01', process: 'Account Opening', achievementPct: 95.0 },
  { month: '2026-02', process: 'Account Opening', achievementPct: 96.2 },
];

const MOCK_QUEUE = {
  metrics: [
    { branch: 'Victoria Island', avgWaitMinutes: 8.5, avgServiceMinutes: 12.3, noShowRate: 0.05, ticketsToday: 145 },
  ],
  peakHours: [
    { hour: 10, volumeCount: 320, avgWaitMinutes: 12.1 },
  ],
};

const MOCK_STAFF = [
  { branch: 'Victoria Island', staffCount: 25, txnPerStaff: 48, revenuePerStaff: 1250000, customersServed: 180 },
  { branch: 'Ikeja', staffCount: 18, txnPerStaff: 42, revenuePerStaff: 980000, customersServed: 150 },
];

const MOCK_EFFICIENCY_TREND = [
  { month: '2026-01', costPerTxn: 13.2 },
  { month: '2026-02', costPerTxn: 12.8 },
];

const MOCK_UPTIME = [
  { service: 'Core Banking', uptimePct: 99.95, downtimeMinutes: 22, incidentCount: 2 },
  { service: 'Mobile App', uptimePct: 99.80, downtimeMinutes: 86, incidentCount: 5 },
];

const MOCK_INCIDENTS = [
  { month: '2026-01', count: 8, mttrHours: 1.5, severity: 'P2' },
  { month: '2026-02', count: 5, mttrHours: 1.2, severity: 'P3' },
];

const MOCK_AUTOMATION = [
  { transactionType: 'Fund Transfer', totalCount: 95000, automatedCount: 85000, manualCount: 10000, automationPct: 89.5, manualInterventionOpportunity: true },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/operations/stats', () => HttpResponse.json(wrap(MOCK_STATS))),
    http.get('/api/v1/reports/operations/sla', () => HttpResponse.json(wrap(MOCK_SLA))),
    http.get('/api/v1/reports/operations/sla-trend', () => HttpResponse.json(wrap(MOCK_SLA_TREND))),
    http.get('/api/v1/reports/operations/queue', () => HttpResponse.json(wrap(MOCK_QUEUE))),
    http.get('/api/v1/reports/operations/staff', () => HttpResponse.json(wrap(MOCK_STAFF))),
    http.get('/api/v1/reports/operations/efficiency-trend', () => HttpResponse.json(wrap(MOCK_EFFICIENCY_TREND))),
    http.get('/api/v1/reports/operations/uptime', () => HttpResponse.json(wrap(MOCK_UPTIME))),
    http.get('/api/v1/reports/operations/incidents', () => HttpResponse.json(wrap(MOCK_INCIDENTS))),
    http.get('/api/v1/reports/operations/automation', () => HttpResponse.json(wrap(MOCK_AUTOMATION))),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OperationalReportsPage', () => {
  it('renders page title', () => {
    setupHandlers();
    renderWithProviders(<OperationalReportsPage />);
    expect(screen.getByText('Operational Reports')).toBeInTheDocument();
  });

  it('displays operations stats cards after load', async () => {
    setupHandlers();
    renderWithProviders(<OperationalReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('SLA Achievement')).toBeInTheDocument();
      expect(screen.getByText('Avg Case Resolution')).toBeInTheDocument();
      expect(screen.getByText('Staff Utilization')).toBeInTheDocument();
      expect(screen.getByText('Cost per Transaction')).toBeInTheDocument();
    });
  });

  it('SLA performance table renders', async () => {
    setupHandlers();
    renderWithProviders(<OperationalReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('SLA Performance')).toBeInTheDocument();
    });
  });

  it('staff productivity table renders', async () => {
    setupHandlers();
    renderWithProviders(<OperationalReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Staff Productivity')).toBeInTheDocument();
    });
  });

  it('system uptime section renders', async () => {
    setupHandlers();
    renderWithProviders(<OperationalReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('System Uptime')).toBeInTheDocument();
    });
  });
});
