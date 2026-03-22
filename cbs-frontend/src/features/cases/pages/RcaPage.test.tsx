import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { RcaPage } from './RcaPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCase = {
  id: 1,
  caseNumber: 'CASE-000001',
  customerId: 1,
  customerName: 'Amara Okonkwo',
  caseType: 'COMPLAINT',
  priority: 'HIGH',
  status: 'OPEN',
  subject: 'ATM did not dispense cash',
  description: 'Customer tried to withdraw from ATM.',
  assignedTo: 'agent-1',
  slaDueAt: new Date(Date.now() + 4 * 3600000).toISOString(),
  slaBreached: false,
  activities: [],
  openedAt: '2026-03-18T10:00:00Z',
  createdAt: '2026-03-18T10:00:00Z',
  updatedAt: '2026-03-18T10:00:00Z',
};

const mockRca = {
  id: 1,
  rcaCode: 'RCA-ABC123',
  caseId: 1,
  analysisMethod: 'FIVE_WHY',
  analysisDate: '2026-03-19',
  analystName: 'Jane Analyst',
  problemStatement: 'ATM hardware fault causing non-dispensing',
  rootCauseCategory: 'SYSTEM',
  rootCauseSubCategory: 'Hardware Failure',
  rootCauseDescription: 'Cash dispenser motor malfunction in unit #4792',
  contributingFactors: {},
  evidenceReferences: {},
  customersAffected: 15,
  financialImpact: 750000,
  reputationalImpact: 'HIGH',
  regulatoryImplication: false,
  correctiveActions: {
    action_1: { action: 'Replace dispenser motor', owner: 'ATM Ops', dueDate: '2026-03-25', priority: 'HIGH', status: 'PENDING' },
  },
  preventiveActions: {},
  lessonsLearned: 'Schedule preventive motor inspections quarterly.',
  status: 'IN_PROGRESS',
};

function setupHandlers({ hasRca = false, rca = mockRca } = {}) {
  server.use(
    http.get('/api/v1/cases/:id', () => HttpResponse.json(wrap(mockCase))),
    http.get('/api/v1/root-cause-analysis/case/:caseId', () =>
      HttpResponse.json(wrap(hasRca ? [rca] : []))
    ),
    http.post('/api/v1/root-cause-analysis', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(
        wrap({ ...mockRca, ...body, rcaCode: 'RCA-NEW001' }),
        { status: 201 }
      );
    }),
    http.post('/api/v1/root-cause-analysis/:code/corrective-action', () =>
      HttpResponse.json(wrap(mockRca))
    ),
    http.post('/api/v1/root-cause-analysis/:code/complete', () =>
      HttpResponse.json(wrap({ ...mockRca, status: 'COMPLETED' }))
    ),
    http.post('/api/v1/root-cause-analysis/:code/validate', () =>
      HttpResponse.json(wrap({ ...mockRca, status: 'VALIDATED' }))
    ),
  );
}

function renderPage(caseId = 'CASE-000001') {
  return renderWithProviders(
    <Routes>
      <Route path="/cases/:id/rca" element={<RcaPage />} />
    </Routes>,
    { route: `/cases/${caseId}/rca` }
  );
}

describe('RcaPage', () => {
  // ── Page Structure ────────────────────────────────────────
  it('renders page header with case number', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/RCA — Case CASE-000001/)).toBeInTheDocument();
    });
  });

  it('shows Back to Case button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Back to Case')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    server.use(http.get('/api/v1/cases/:id', () => new Promise(() => {})));
    renderPage();
    expect(screen.getByText('Root Cause Analysis')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  // ── Empty State (No RCA) ──────────────────────────────────
  it('shows empty state when no RCA exists', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No Root Cause Analysis')).toBeInTheDocument();
    });
    expect(screen.getByText(/No RCA has been initiated/)).toBeInTheDocument();
  });

  it('shows Start RCA button when no RCA exists', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Start RCA')).toBeInTheDocument();
    });
  });

  // ── RCA Creation Form ─────────────────────────────────────
  it('clicking Start RCA shows the creation form', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Analysis Setup')).toBeInTheDocument();
    expect(screen.getByText('Root Cause')).toBeInTheDocument();
    expect(screen.getByText('Impact Assessment')).toBeInTheDocument();
    expect(screen.getByText("Lessons & Preventive Actions")).toBeInTheDocument();
  });

  it('creation form has analysis method selector with all methods', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Analysis Method')).toBeInTheDocument();
    expect(screen.getByText('5 Why Analysis')).toBeInTheDocument();
    expect(screen.getByText('Fishbone (Ishikawa)')).toBeInTheDocument();
    expect(screen.getByText('Fault Tree Analysis')).toBeInTheDocument();
    expect(screen.getByText('Pareto Analysis')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('creation form has root cause category options including DATA and INFRASTRUCTURE', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Process')).toBeInTheDocument();
    expect(screen.getByText('System / Technology')).toBeInTheDocument();
    expect(screen.getByText('People / Training')).toBeInTheDocument();
    expect(screen.getByText('Third Party')).toBeInTheDocument();
    expect(screen.getByText('Policy / Regulation')).toBeInTheDocument();
    expect(screen.getByText('Data / Information')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
  });

  it('creation form has analyst name input', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Analyst Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
  });

  it('creation form has problem statement textarea', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Problem Statement')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Clearly describe the problem...')).toBeInTheDocument();
  });

  it('creation form has impact assessment fields', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Customers Affected')).toBeInTheDocument();
    expect(screen.getByText('Financial Impact (₦)')).toBeInTheDocument();
    expect(screen.getByText('Reputational Impact')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Implication')).toBeInTheDocument();
  });

  it('creation form Create RCA button is disabled without required fields', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    const btn = screen.getByText('Create RCA');
    expect(btn).toBeDisabled();
  });

  // ── RCA Summary Display ───────────────────────────────────
  it('shows RCA code when RCA exists', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA-ABC123')).toBeInTheDocument();
    });
  });

  it('shows RCA status badge', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA-ABC123')).toBeInTheDocument();
    });
    // StatusBadge renders the status text - look for it in any form
    const statusEl = document.querySelector('[class*="badge"], [class*="Badge"]') ??
      screen.queryByText(/IN.PROGRESS/i);
    expect(statusEl).toBeTruthy();
  });

  it('shows analysis method', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('FIVE WHY')).toBeInTheDocument();
    });
  });

  it('shows analyst name', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Jane Analyst')).toBeInTheDocument();
    });
  });

  it('shows problem statement', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ATM hardware fault causing non-dispensing')).toBeInTheDocument();
    });
  });

  it('shows root cause description', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Cash dispenser motor malfunction/)).toBeInTheDocument();
    });
  });

  it('shows root cause category and sub-category', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('SYSTEM')).toBeInTheDocument();
      expect(screen.getByText('Hardware Failure')).toBeInTheDocument();
    });
  });

  it('shows customers affected count', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  it('shows financial impact', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('₦750,000')).toBeInTheDocument();
    });
  });

  it('shows lessons learned', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Lessons Learned')).toBeInTheDocument();
      expect(screen.getByText(/Schedule preventive motor inspections/)).toBeInTheDocument();
    });
  });

  it('shows regulatory implication as No when false', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  it('shows regulatory implication as Yes when true', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, regulatoryImplication: true } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });

  // ── Workflow Actions ──────────────────────────────────────
  it('shows Mark Complete button for IN_PROGRESS RCA', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });
  });

  it('does not show Validate button for IN_PROGRESS RCA', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });
    expect(screen.queryByText('Validate RCA')).not.toBeInTheDocument();
  });

  it('shows Validate RCA button for COMPLETED RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'COMPLETED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Validate RCA')).toBeInTheDocument();
    });
  });

  it('does not show Mark Complete for COMPLETED RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'COMPLETED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Validate RCA')).toBeInTheDocument();
    });
    expect(screen.queryByText('Mark Complete')).not.toBeInTheDocument();
  });

  it('hides all workflow buttons for VALIDATED RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'VALIDATED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA-ABC123')).toBeInTheDocument();
    });
    expect(screen.queryByText('Mark Complete')).not.toBeInTheDocument();
    expect(screen.queryByText('Validate RCA')).not.toBeInTheDocument();
  });

  // ── Corrective Actions ────────────────────────────────────
  it('shows Corrective Actions section', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Corrective Actions')).toBeInTheDocument();
    });
  });

  it('shows existing corrective actions from RCA data', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Corrective Actions')).toBeInTheDocument();
    });
    // Corrective action rendered as JSON.stringify
    expect(screen.getByText(/Replace dispenser motor/)).toBeInTheDocument();
  });

  it('shows Add Corrective Action form for non-validated RCA', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Add Corrective Action')).toBeInTheDocument();
    });
  });

  it('corrective action form has required fields', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Describe the corrective action...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Responsible party')).toBeInTheDocument();
    });
  });

  it('Add Action button is disabled with empty fields', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      const btn = screen.getByText('Add Action');
      expect(btn).toBeDisabled();
    });
  });

  it('hides corrective action form for VALIDATED RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'VALIDATED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Corrective Actions')).toBeInTheDocument();
    });
    expect(screen.queryByText('Add Corrective Action')).not.toBeInTheDocument();
  });

  it('shows empty corrective actions message when none exist', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, correctiveActions: {} } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No corrective actions added yet.')).toBeInTheDocument();
    });
  });

  // ── Preventive Actions ────────────────────────────────────
  it('shows preventive actions when present', async () => {
    setupHandlers({
      hasRca: true,
      rca: {
        ...mockRca,
        preventiveActions: { action_1: { action: 'Quarterly inspections', owner: 'Maintenance' } },
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Preventive Actions')).toBeInTheDocument();
      expect(screen.getByText(/Quarterly inspections/)).toBeInTheDocument();
    });
  });

  it('hides preventive actions section when empty', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA-ABC123')).toBeInTheDocument();
    });
    expect(screen.queryByText('Preventive Actions')).not.toBeInTheDocument();
  });

  // ── Navigation ────────────────────────────────────────────
  it('shows RCA Dashboard link', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('View RCA Dashboard →')).toBeInTheDocument();
    });
  });
});
