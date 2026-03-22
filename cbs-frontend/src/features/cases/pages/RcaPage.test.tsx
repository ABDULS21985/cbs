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

  it('clicking Start RCA shows the creation form', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Start RCA')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Start RCA'));
    expect(screen.getByText('Analysis Setup')).toBeInTheDocument();
    expect(screen.getByText('Root Cause')).toBeInTheDocument();
    expect(screen.getByText('Impact Assessment')).toBeInTheDocument();
  });

  it('RCA creation form has analysis method selector', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Analysis Method')).toBeInTheDocument();
    expect(screen.getByText('5 Why Analysis')).toBeInTheDocument();
    expect(screen.getByText('Fishbone (Ishikawa)')).toBeInTheDocument();
  });

  it('RCA creation form has root cause category options', async () => {
    setupHandlers({ hasRca: false });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Start RCA')));
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Process')).toBeInTheDocument();
    expect(screen.getByText('System / Technology')).toBeInTheDocument();
  });

  it('shows RCA summary when RCA exists', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA-ABC123')).toBeInTheDocument();
    });
  });

  it('shows RCA analysis method', async () => {
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

  it('shows Mark Complete button for IN_PROGRESS RCA', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });
  });

  it('shows Validate RCA button for COMPLETED RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'COMPLETED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Validate RCA')).toBeInTheDocument();
    });
  });

  it('hides workflow buttons for VALIDATED RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'VALIDATED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA-ABC123')).toBeInTheDocument();
    });
    expect(screen.queryByText('Mark Complete')).not.toBeInTheDocument();
    expect(screen.queryByText('Validate RCA')).not.toBeInTheDocument();
  });

  it('shows corrective actions section', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Corrective Actions')).toBeInTheDocument();
    });
  });

  it('shows corrective action form for non-validated RCA', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Add Corrective Action')).toBeInTheDocument();
    });
  });

  it('hides corrective action form for validated RCA', async () => {
    setupHandlers({ hasRca: true, rca: { ...mockRca, status: 'VALIDATED' } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Corrective Actions')).toBeInTheDocument();
    });
    expect(screen.queryByText('Add Corrective Action')).not.toBeInTheDocument();
  });

  it('shows lessons learned when present', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Lessons Learned')).toBeInTheDocument();
      expect(screen.getByText(/Schedule preventive motor inspections/)).toBeInTheDocument();
    });
  });

  it('shows RCA Dashboard link', async () => {
    setupHandlers({ hasRca: true });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('View RCA Dashboard →')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    server.use(
      http.get('/api/v1/cases/:id', () => new Promise(() => {})),
    );
    renderPage();
    expect(screen.getByText('Root Cause Analysis')).toBeInTheDocument();
    const pulse = document.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });
});
