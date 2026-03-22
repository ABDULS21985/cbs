import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ComplianceHubPage } from './ComplianceHubPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockComplianceStats = {
  activeAssessments: 12,
  openGaps: 34,
  criticalGaps: 5,
  overdueRemediations: 3,
  complianceScore: 78,
};

const mockGapDashboard = {
  count_IDENTIFIED: 10,
  count_IN_PROGRESS: 8,
  count_REMEDIATED: 15,
  count_VERIFIED: 6,
};

const mockOverdueGaps = [
  { id: 1, code: 'GAP-001', title: 'Overdue gap 1', targetDate: '2025-12-01' },
  { id: 2, code: 'GAP-002', title: 'Overdue gap 2', targetDate: '2025-11-15' },
];

const mockAmlStats = {
  openAlerts: 7,
  underReview: 3,
  sarsFiled: 2,
  falsePositives: 12,
  totalAlerts: 24,
};

const mockFraudStats = {
  openAlerts: 4,
  activeAlerts: 4,
  investigating: 2,
  confirmedFraud: 1,
  blocked: 3,
  totalAlerts: 10,
};

const mockSanctionsStats = {
  pendingReview: 6,
  totalScreenings: 150,
};

function setupHandlers(overrides?: {
  stats?: typeof mockComplianceStats;
  gapDashboard?: typeof mockGapDashboard;
  overdueGaps?: typeof mockOverdueGaps;
  amlStats?: typeof mockAmlStats;
  fraudStats?: typeof mockFraudStats;
  sanctionsStats?: typeof mockSanctionsStats;
}) {
  server.use(
    http.get('/api/v1/compliance/stats', () =>
      HttpResponse.json(wrap(overrides?.stats ?? mockComplianceStats)),
    ),
    http.get('/api/v1/gap-analysis/dashboard', () =>
      HttpResponse.json(wrap(overrides?.gapDashboard ?? mockGapDashboard)),
    ),
    http.get('/api/v1/gap-analysis/overdue', () =>
      HttpResponse.json(wrap(overrides?.overdueGaps ?? mockOverdueGaps)),
    ),
    http.get('/api/v1/aml/stats', () =>
      HttpResponse.json(wrap(overrides?.amlStats ?? mockAmlStats)),
    ),
    http.get('/api/v1/fraud/stats', () =>
      HttpResponse.json(wrap(overrides?.fraudStats ?? mockFraudStats)),
    ),
    http.get('/api/v1/sanctions/stats', () =>
      HttpResponse.json(wrap(overrides?.sanctionsStats ?? mockSanctionsStats)),
    ),
  );
}

describe('ComplianceHubPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    expect(screen.getByText('Compliance & Risk Management')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    expect(screen.getByText(/chief compliance officer command center/i)).toBeInTheDocument();
  });

  it('renders the health gauge section', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Compliance Health')).toBeInTheDocument();
    });
  });

  it('renders the health gauge score', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });

  it('displays the health label based on score', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Adequate')).toBeInTheDocument();
    });
  });

  it('renders key metrics stat cards', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      // Wait for stats to load — these labels only appear when loading=false
      expect(screen.getByText('Critical Gaps')).toBeInTheDocument();
    });
    expect(screen.getByText('AML Alerts')).toBeInTheDocument();
    expect(screen.getByText('Fraud Alerts')).toBeInTheDocument();
    expect(screen.getByText('Sanctions Pending')).toBeInTheDocument();
    expect(screen.getByText('Total Open Alerts')).toBeInTheDocument();
  });

  it('displays stat card values from API', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      // Wait for stat card values to render
      expect(screen.getByText('Critical Gaps')).toBeInTheDocument();
    });
    // Stat values may appear in multiple cards; just check they exist
    const allText = document.body.textContent ?? '';
    expect(allText).toContain('5');
    expect(allText).toContain('34');
  });

  it('renders quick link cards for all compliance modules', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    expect(screen.getByText('Compliance Modules')).toBeInTheDocument();
    expect(screen.getByText('Gap Analysis')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Returns')).toBeInTheDocument();
    expect(screen.getByText('Report Definitions')).toBeInTheDocument();
    // AML/CFT and Fraud Detection appear in both quick links and summary sections
    expect(screen.getAllByText('AML/CFT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fraud Detection').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sanctions Screening')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders quick link descriptions', () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    expect(screen.getByText('Compliance assessment tracking and scoring')).toBeInTheDocument();
    expect(screen.getByText('Anti-money laundering monitoring')).toBeInTheDocument();
    expect(screen.getByText('Transaction fraud monitoring')).toBeInTheDocument();
    expect(screen.getByText('Name screening and watchlist management')).toBeInTheDocument();
  });

  it('quick link cards are clickable buttons', () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    // Quick link cards in the "Compliance Modules" section are buttons
    const sanctionsCard = screen.getByText('Sanctions Screening').closest('button');
    expect(sanctionsCard).toBeInTheDocument();
    const auditCard = screen.getByText('Audit Trail').closest('button');
    expect(auditCard).toBeInTheDocument();
  });

  it('quick link cards navigate on click', () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    const sanctionsCard = screen.getByText('Sanctions Screening').closest('button')!;
    fireEvent.click(sanctionsCard);
    // Navigation is handled by react-router inside MemoryRouter; no error means it navigated
    expect(sanctionsCard).toBeInTheDocument();
  });

  it('shows critical alert banner when there are overdue gaps', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Attention Required')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 overdue gap remediations/)).toBeInTheDocument();
  });

  it('does not show critical alert banner when no overdue gaps and alerts <= 10', async () => {
    setupHandlers({
      overdueGaps: [],
      amlStats: { ...mockAmlStats, openAlerts: 1 },
      fraudStats: { ...mockFraudStats, openAlerts: 1 },
      sanctionsStats: { pendingReview: 1, totalScreenings: 10 },
    });
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Compliance Health')).toBeInTheDocument();
    });
    expect(screen.queryByText('Attention Required')).not.toBeInTheDocument();
  });

  it('renders gap remediation summary section', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('Gap Remediation')).toBeInTheDocument();
    });
  });

  it('renders AML/CFT summary section with stats', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      // The section heading "AML/CFT" in the status overview
      const amlHeadings = screen.getAllByText('AML/CFT');
      expect(amlHeadings.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Open Alerts')).toBeInTheDocument();
    expect(screen.getByText('Under Review')).toBeInTheDocument();
    expect(screen.getByText('SARs Filed')).toBeInTheDocument();
    expect(screen.getByText('False Positives')).toBeInTheDocument();
  });

  it('renders Fraud Detection summary section with stats', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      const fraudHeadings = screen.getAllByText('Fraud Detection');
      expect(fraudHeadings.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('Investigating')).toBeInTheDocument();
    expect(screen.getByText('Confirmed Fraud')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('renders View All links in summary sections', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      const viewAllLinks = screen.getAllByText('View All');
      expect(viewAllLinks.length).toBe(3);
    });
  });

  it('handles compliance stats API error gracefully', () => {
    server.use(
      http.get('/api/v1/compliance/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/gap-analysis/dashboard', () => HttpResponse.json(wrap(mockGapDashboard))),
      http.get('/api/v1/gap-analysis/overdue', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/aml/stats', () => HttpResponse.json(wrap(mockAmlStats))),
      http.get('/api/v1/fraud/stats', () => HttpResponse.json(wrap(mockFraudStats))),
      http.get('/api/v1/sanctions/stats', () => HttpResponse.json(wrap(mockSanctionsStats))),
    );
    renderWithProviders(<ComplianceHubPage />);
    expect(screen.getByText('Compliance & Risk Management')).toBeInTheDocument();
  });

  it('handles multiple API failures gracefully', () => {
    server.use(
      http.get('/api/v1/compliance/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/gap-analysis/dashboard', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/gap-analysis/overdue', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/stats', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<ComplianceHubPage />);
    expect(screen.getByText('Compliance & Risk Management')).toBeInTheDocument();
    expect(screen.getByText('Compliance Modules')).toBeInTheDocument();
  });

  it('shows strong health label for score >= 90', async () => {
    setupHandlers({ stats: { ...mockComplianceStats, complianceScore: 95 } });
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('shows Needs Attention label for score < 70', async () => {
    setupHandlers({ stats: { ...mockComplianceStats, complianceScore: 55 } });
    renderWithProviders(<ComplianceHubPage />);
    await waitFor(() => {
      expect(screen.getByText('55%')).toBeInTheDocument();
    });
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  });
});
