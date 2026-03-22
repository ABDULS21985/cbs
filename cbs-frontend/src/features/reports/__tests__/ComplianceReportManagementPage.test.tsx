import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { ComplianceReportManagementPage } from '../pages/ComplianceReportManagementPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  total: 42,
  overdue: 3,
  draft: 12,
  submitted: 27,
};

const MOCK_REPORTS = [
  {
    id: 1,
    reportCode: 'CBN-STA-ABC123',
    reportName: 'Monthly Prudential Return',
    reportType: 'STATUTORY_RETURN',
    regulator: 'CBN',
    reportingPeriod: 'MONTHLY',
    dueDate: '2026-03-31',
    status: 'DRAFT',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 2,
    reportCode: 'NDIC-AML-DEF456',
    reportName: 'AML Quarterly Report',
    reportType: 'AML_CTF_REPORT',
    regulator: 'NDIC',
    reportingPeriod: 'QUARTERLY',
    dueDate: '2026-03-15',
    status: 'OVERDUE',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 3,
    reportCode: 'SEC-PRU-GHI789',
    reportName: 'Capital Adequacy Annual',
    reportType: 'CAPITAL_ADEQUACY',
    regulator: 'SEC',
    reportingPeriod: 'ANNUAL',
    dueDate: '2026-06-30',
    status: 'SUBMITTED',
    submissionReference: 'REF-2026-001',
    submittedAt: '2026-02-28T15:30:00Z',
    submittedBy: 'admin',
    createdAt: '2026-01-15T10:00:00Z',
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/compliance-reports/stats', () =>
      HttpResponse.json(wrap(MOCK_STATS)),
    ),
    http.get('/api/v1/compliance-reports', () =>
      HttpResponse.json(wrap(MOCK_REPORTS)),
    ),
    http.get('/api/v1/compliance-reports/overdue', () =>
      HttpResponse.json(wrap(MOCK_REPORTS.filter((r) => r.status === 'OVERDUE'))),
    ),
    http.get('/api/v1/compliance-reports/returns', () =>
      HttpResponse.json(wrap(MOCK_REPORTS.filter((r) => r.status === 'SUBMITTED'))),
    ),
    http.get('/api/v1/compliance-reports/assessments', () =>
      HttpResponse.json(wrap([])),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ComplianceReportManagementPage', () => {
  it('renders page header "Compliance Reports"', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    expect(screen.getByText('Compliance Reports')).toBeInTheDocument();
  });

  it('displays stats cards after load', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Reports')).toBeInTheDocument();
      expect(screen.getAllByText('Overdue').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Submitted')).toBeInTheDocument();
    });
  });

  it('displays stats values after load', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('27')).toBeInTheDocument();
    });
  });

  it('displays compliance reports in table after load', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('CBN-STA-ABC123')).toBeInTheDocument();
      expect(screen.getByText('Monthly Prudential Return')).toBeInTheDocument();
      expect(screen.getByText('AML Quarterly Report')).toBeInTheDocument();
    });
  });

  it('shows Create Report button', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    expect(
      screen.getByRole('button', { name: /create report/i }),
    ).toBeInTheDocument();
  });

  it('shows status badges with correct text', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
      expect(screen.getByText('OVERDUE')).toBeInTheDocument();
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    });
  });

  it('tabs are present (All Reports, Overdue, Returns, Assessments)', () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    expect(screen.getByText('All Reports')).toBeInTheDocument();
    expect(screen.getByText('Returns')).toBeInTheDocument();
    expect(screen.getByText('Assessments')).toBeInTheDocument();
  });

  it('shows Review button for DRAFT status reports', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /review/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows View button for report details', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceReportManagementPage />);
    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });
});
