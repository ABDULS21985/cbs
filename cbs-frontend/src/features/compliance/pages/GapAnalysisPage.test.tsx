import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { GapAnalysisPage } from './GapAnalysisPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockGaps = [
  {
    id: 1,
    analysisCode: 'GAP-001',
    assessmentId: 10,
    requirementRef: 'REQ-101',
    requirementDescription: 'Capital adequacy ratio requirement',
    regulatorySource: 'BASEL_III',
    clauseReference: 'Art 92',
    currentState: 'Manual calculation process',
    targetState: 'Automated daily calculation',
    gapDescription: 'No automated capital ratio calculation',
    gapSeverity: 'CRITICAL',
    gapCategory: 'SYSTEM',
    riskIfUnaddressed: 'HIGH',
    remediationOwner: 'John Smith',
    remediationDescription: 'Implement automated calculation engine',
    remediationCost: 150000,
    remediationStartDate: '2025-06-01',
    remediationTargetDate: '2025-09-01',
    remediationActualDate: null,
    remediationMilestones: {},
    evidenceRefs: {},
    verifiedBy: null,
    verifiedAt: null,
    status: 'IDENTIFIED',
    createdAt: '2025-05-01',
  },
  {
    id: 2,
    analysisCode: 'GAP-002',
    assessmentId: 10,
    requirementRef: 'REQ-202',
    requirementDescription: 'KYC documentation completeness',
    regulatorySource: 'LOCAL_REGULATION',
    clauseReference: 'Sec 5.2',
    currentState: 'Paper-based KYC',
    targetState: 'Digital KYC with verification',
    gapDescription: 'KYC documents not digitized',
    gapSeverity: 'HIGH',
    gapCategory: 'PROCESS',
    riskIfUnaddressed: 'MEDIUM',
    remediationOwner: 'Jane Doe',
    remediationDescription: 'Deploy digital KYC platform',
    remediationCost: 80000,
    remediationStartDate: '2025-07-01',
    remediationTargetDate: '2025-10-15',
    remediationActualDate: null,
    remediationMilestones: {},
    evidenceRefs: {},
    verifiedBy: null,
    verifiedAt: null,
    status: 'REMEDIATION_PLANNED',
    createdAt: '2025-06-01',
  },
  {
    id: 3,
    analysisCode: 'GAP-003',
    assessmentId: 11,
    requirementRef: 'REQ-303',
    requirementDescription: 'Transaction monitoring threshold',
    regulatorySource: 'FATCA',
    clauseReference: 'Rule 7.1',
    currentState: 'Static thresholds only',
    targetState: 'Dynamic risk-based thresholds',
    gapDescription: 'Transaction monitoring lacks dynamic thresholds',
    gapSeverity: 'MEDIUM',
    gapCategory: 'POLICY',
    riskIfUnaddressed: 'LOW',
    remediationOwner: 'Bob Lee',
    remediationDescription: 'Update monitoring rules engine',
    remediationCost: 50000,
    remediationStartDate: '2025-08-01',
    remediationTargetDate: '2025-12-01',
    remediationActualDate: null,
    remediationMilestones: {},
    evidenceRefs: {},
    verifiedBy: null,
    verifiedAt: null,
    status: 'IN_PROGRESS',
    createdAt: '2025-07-15',
  },
  {
    id: 4,
    analysisCode: 'GAP-004',
    assessmentId: 12,
    requirementRef: 'REQ-404',
    requirementDescription: 'Data privacy compliance',
    regulatorySource: 'GDPR',
    clauseReference: 'Art 17',
    currentState: 'No automated data erasure',
    targetState: 'Automated erasure workflows',
    gapDescription: 'Right to erasure not automated',
    gapSeverity: 'LOW',
    gapCategory: 'DOCUMENTATION',
    riskIfUnaddressed: 'MEDIUM',
    remediationOwner: 'Alice Chen',
    remediationDescription: 'Build erasure workflow',
    remediationCost: 30000,
    remediationStartDate: '2025-04-01',
    remediationTargetDate: '2025-06-01',
    remediationActualDate: '2025-05-28',
    remediationMilestones: {},
    evidenceRefs: {},
    verifiedBy: null,
    verifiedAt: null,
    status: 'REMEDIATED',
    createdAt: '2025-03-01',
  },
];

const mockDashboard = {
  totalGaps: 4,
  criticalGaps: 1,
  highGaps: 1,
  mediumGaps: 1,
  lowGaps: 1,
  overdueGaps: 1,
};

const mockOverdue = [
  {
    id: 1,
    analysisCode: 'GAP-001',
    assessmentId: 10,
    requirementRef: 'REQ-101',
    requirementDescription: 'Capital adequacy ratio requirement',
    regulatorySource: 'BASEL_III',
    clauseReference: 'Art 92',
    currentState: 'Manual calculation process',
    targetState: 'Automated daily calculation',
    gapDescription: 'No automated capital ratio calculation',
    gapSeverity: 'CRITICAL',
    gapCategory: 'SYSTEM',
    riskIfUnaddressed: 'HIGH',
    remediationOwner: 'John Smith',
    remediationDescription: 'Implement automated calculation engine',
    remediationCost: 150000,
    remediationStartDate: '2025-06-01',
    remediationTargetDate: '2025-09-01',
    remediationActualDate: null,
    remediationMilestones: {},
    evidenceRefs: {},
    verifiedBy: null,
    verifiedAt: null,
    status: 'IDENTIFIED',
    createdAt: '2025-05-01',
  },
];

function setupHandlers(
  gaps = mockGaps,
  dashboard = mockDashboard,
  overdue = mockOverdue,
) {
  server.use(
    http.get('/api/v1/gap-analysis', () => HttpResponse.json(wrap(gaps))),
    http.get('/api/v1/gap-analysis/dashboard', () => HttpResponse.json(wrap(dashboard))),
    http.get('/api/v1/gap-analysis/overdue', () => HttpResponse.json(wrap(overdue))),
    http.post('/api/v1/gap-analysis', () => HttpResponse.json(wrap({ id: 5, analysisCode: 'GAP-005', status: 'IDENTIFIED' }))),
    http.post('/api/v1/gap-analysis/:code/plan', () => HttpResponse.json(wrap({ status: 'REMEDIATION_PLANNED' }))),
    http.post('/api/v1/gap-analysis/:code/progress', () => HttpResponse.json(wrap({ status: 'IN_PROGRESS' }))),
    http.post('/api/v1/gap-analysis/:code/close', () => HttpResponse.json(wrap({ status: 'REMEDIATED' }))),
    http.post('/api/v1/gap-analysis/:code/verify', () => HttpResponse.json(wrap({ status: 'VERIFIED' }))),
    http.post('/api/v1/gap-analysis/:code/accept-risk', () => HttpResponse.json(wrap({ status: 'ACCEPTED_RISK' }))),
  );
}

describe('GapAnalysisPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText('Compliance Gap Analysis')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText(/identify.*track.*remediate.*compliance gaps/i)).toBeInTheDocument();
  });

  it('renders the Identify New Gap button', () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText('Identify New Gap')).toBeInTheDocument();
  });

  it('renders lifecycle pipeline section', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Gap Lifecycle Pipeline')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders lifecycle pipeline stages', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('IDENTIFIED')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('REMEDIATION PLANNED')).toBeInTheDocument();
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('REMEDIATED')).toBeInTheDocument();
    expect(screen.getByText('VERIFIED')).toBeInTheDocument();
    expect(screen.getByText('ACCEPTED RISK')).toBeInTheDocument();
  });

  it('renders 6 dashboard stat cards', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Gaps')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Critical')).toBeInTheDocument();
    // "In Progress" appears in both stat card and pipeline - just check it exists
    const inProgressEls = screen.getAllByText('In Progress');
    expect(inProgressEls.length).toBeGreaterThanOrEqual(1);
    // "Remediated" appears in stat card and pipeline
    const remediatedEls = screen.getAllByText(/^Remediated$/i);
    expect(remediatedEls.length).toBeGreaterThanOrEqual(1);
    // "Overdue" may also appear in overdue tab label
    const overdueEls = screen.getAllByText('Overdue');
    expect(overdueEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Accepted Risk')).toBeInTheDocument();
  });

  it('renders overdue alert when overdue gaps exist', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    // Wait for overdue data to load so the alert banner appears
    await waitFor(() => {
      expect(screen.getByText(/Immediate attention required/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('does not render overdue alert when no overdue gaps', async () => {
    setupHandlers(mockGaps, mockDashboard, []);
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Gaps')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByText(/immediate attention required/i)).not.toBeInTheDocument();
  });

  it('renders Gap Register tab by default with gap data', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('GAP-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('GAP-002')).toBeInTheDocument();
    expect(screen.getByText('GAP-003')).toBeInTheDocument();
    expect(screen.getByText('GAP-004')).toBeInTheDocument();
  });

  it('renders gap register table columns', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Code')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Requirement')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders aging chart on Gap Register tab', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Open Gap Aging')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('opens Identify Gap dialog when button clicked', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    fireEvent.click(screen.getByText('Identify New Gap'));
    await waitFor(() => {
      expect(screen.getByText('Identify New Gap', { selector: 'h2' })).toBeInTheDocument();
    });
    expect(screen.getByText('Requirement Ref *')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Source')).toBeInTheDocument();
    expect(screen.getByText('Gap Description *')).toBeInTheDocument();
  });

  it('closes Identify Gap dialog when Cancel is clicked', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    fireEvent.click(screen.getByText('Identify New Gap'));
    await waitFor(() => {
      expect(screen.getByText('Identify New Gap', { selector: 'h2' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Requirement Ref *')).not.toBeInTheDocument();
    });
  });

  it('renders Plan action button for IDENTIFIED gaps', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('GAP-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('renders Start action button for REMEDIATION_PLANNED gaps', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('GAP-002')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('renders Remediate action button for IN_PROGRESS gaps', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('GAP-003')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Remediate')).toBeInTheDocument();
  });

  it('renders Verify action button for REMEDIATED gaps', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('GAP-004')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Verify')).toBeInTheDocument();
  });

  it('opens Plan Remediation dialog when Plan is clicked', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Plan')).toBeInTheDocument();
    }, { timeout: 3000 });
    fireEvent.click(screen.getByText('Plan'));
    await waitFor(() => {
      // "Plan Remediation" appears in both dialog heading and submit button
      expect(screen.getByText('Plan Remediation', { selector: 'h2' })).toBeInTheDocument();
    });
    expect(screen.getByText('Remediation Owner *')).toBeInTheDocument();
    expect(screen.getByText('Target Date *')).toBeInTheDocument();
  });

  it('opens Verify dialog when Verify is clicked', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Verify')).toBeInTheDocument();
    }, { timeout: 3000 });
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => {
      expect(screen.getByText('Verify Gap Remediation')).toBeInTheDocument();
    });
    expect(screen.getByText('Verified By *')).toBeInTheDocument();
  });

  it('renders Accept Risk buttons for non-terminal gaps', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('GAP-001')).toBeInTheDocument();
    }, { timeout: 3000 });
    const acceptRiskBtns = screen.getAllByText('Accept Risk');
    // IDENTIFIED, REMEDIATION_PLANNED, and IN_PROGRESS gaps should have Accept Risk
    expect(acceptRiskBtns.length).toBeGreaterThanOrEqual(3);
  });

  it('can switch to Overdue tab', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Gap Register')).toBeInTheDocument();
    }, { timeout: 3000 });
    fireEvent.click(screen.getByText('Overdue'));
    await waitFor(() => {
      expect(screen.getByText('Total Overdue')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('can switch to Gap Analytics tab', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('Gap Register')).toBeInTheDocument();
    }, { timeout: 3000 });
    fireEvent.click(screen.getByText('Gap Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Severity Distribution')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
  });

  it('renders three tabs', () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText('Gap Register')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Gap Analytics')).toBeInTheDocument();
  });

  it('shows empty state when no gaps exist', async () => {
    setupHandlers([], mockDashboard, []);
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('No gaps found')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows empty state on Overdue tab when no overdue gaps', async () => {
    setupHandlers(mockGaps, mockDashboard, []);
    renderWithProviders(<GapAnalysisPage />);
    fireEvent.click(screen.getByText('Overdue'));
    await waitFor(() => {
      expect(screen.getByText('No overdue gaps')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles gap list API error gracefully', () => {
    server.use(
      http.get('/api/v1/gap-analysis', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/gap-analysis/dashboard', () => HttpResponse.json(wrap(mockDashboard))),
      http.get('/api/v1/gap-analysis/overdue', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText('Compliance Gap Analysis')).toBeInTheDocument();
  });

  it('handles dashboard API error gracefully', () => {
    server.use(
      http.get('/api/v1/gap-analysis', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/gap-analysis/dashboard', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/gap-analysis/overdue', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText('Compliance Gap Analysis')).toBeInTheDocument();
  });

  it('handles overdue API error gracefully', () => {
    server.use(
      http.get('/api/v1/gap-analysis', () => HttpResponse.json(wrap(mockGaps))),
      http.get('/api/v1/gap-analysis/dashboard', () => HttpResponse.json(wrap(mockDashboard))),
      http.get('/api/v1/gap-analysis/overdue', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<GapAnalysisPage />);
    expect(screen.getByText('Compliance Gap Analysis')).toBeInTheDocument();
  });

  it('renders aging chart on Gap Analytics tab', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    fireEvent.click(screen.getByText('Gap Analytics'));
    await waitFor(() => {
      expect(screen.getByText('Open Gap Aging')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders severity and category data in the gap table', async () => {
    setupHandlers();
    renderWithProviders(<GapAnalysisPage />);
    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
    expect(screen.getByText('BASEL_III')).toBeInTheDocument();
  });
});
