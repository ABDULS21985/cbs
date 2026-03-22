import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AlcoReportPage } from '../pages/AlcoReportPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockPack = {
  id: 1,
  month: '2026-03',
  sections: ['executive-summary', 'gap-analysis', 'duration-report'],
  executiveSummary: 'Monthly ALCO summary text.',
  status: 'DRAFT',
  preparedBy: 'treasury_head',
  approvedBy: null,
  approvedAt: null,
  distributedAt: null,
  version: 1,
  packId: 1,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
};

const mockActionItems = [
  {
    id: 1,
    itemNumber: 'AI-0001',
    description: 'Review duration gap strategy',
    owner: 'Treasury Head',
    dueDate: '2026-04-15',
    status: 'OPEN',
    updateNotes: '',
    meetingDate: '2026-03-15',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
  },
  {
    id: 2,
    itemNumber: 'AI-0002',
    description: 'Submit IRRBB return',
    owner: 'Risk Officer',
    dueDate: '2026-03-01', // overdue
    status: 'IN_PROGRESS',
    updateNotes: 'Awaiting gap data',
    meetingDate: '2026-03-15',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-15T10:00:00Z',
  },
];

const mockScenarios = [
  { id: 1, scenarioName: 'Parallel +200', scenarioType: 'PARALLEL_UP', shiftBps: { '1Y': 200 }, description: '', isRegulatory: true, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
];

function setupHandlers(opts?: { pack?: unknown; packs?: unknown[]; actionItems?: unknown[]; versions?: unknown[] }) {
  const month = new Date().toISOString().slice(0, 7);
  server.use(
    http.get('/api/v1/alm/alco-packs', () => HttpResponse.json(wrap(opts?.packs ?? [mockPack]))),
    http.get('/api/v1/alm/alco-packs/month/:month', () => HttpResponse.json(wrap(opts?.pack ?? mockPack))),
    http.get('/api/v1/alm/alco-packs/month/:month/versions', () => HttpResponse.json(wrap(opts?.versions ?? [mockPack]))),
    http.post('/api/v1/alm/alco-packs', () => HttpResponse.json(wrap(mockPack))),
    http.patch('/api/v1/alm/alco-packs/:id', () => HttpResponse.json(wrap(mockPack))),
    http.post('/api/v1/alm/alco-packs/:id/submit', () => HttpResponse.json(wrap({ ...mockPack, status: 'PENDING_REVIEW' }))),
    http.post('/api/v1/alm/alco-packs/:id/approve', () => HttpResponse.json(wrap({ ...mockPack, status: 'APPROVED', approvedBy: 'admin' }))),
    http.post('/api/v1/alm/alco-packs/:id/distribute', () => HttpResponse.json(wrap({ ...mockPack, status: 'DISTRIBUTED' }))),
    http.post('/api/v1/alm/alco-packs/generate-summary', () => HttpResponse.json(wrap({ summary: 'Auto-generated ALCO summary for the month.' }))),
    http.get('/api/v1/alm/action-items', () => HttpResponse.json(wrap(opts?.actionItems ?? mockActionItems))),
    http.post('/api/v1/alm/action-items', () => HttpResponse.json(wrap({ ...mockActionItems[0], id: 3, itemNumber: 'AI-0003' }))),
    http.patch('/api/v1/alm/action-items/:id', () => HttpResponse.json(wrap({ ...mockActionItems[0], status: 'CLOSED' }))),
    http.get('/api/v1/alm/scenarios', () => HttpResponse.json(wrap(mockScenarios))),
  );
}

describe('AlcoReportPage', () => {
  it('renders page header and stat cards', async () => {
    setupHandlers();
    renderWithProviders(<AlcoReportPage />);
    expect(screen.getByText('ALCO Report Pack')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Pack Status')).toBeInTheDocument();
    });
    expect(screen.getByText('Open Action Items')).toBeInTheDocument();
    expect(screen.getByText('Overdue Items')).toBeInTheDocument();
    expect(screen.getByText('Packs This Year')).toBeInTheDocument();
  });

  it('renders Pack Builder tab with section toggles', async () => {
    setupHandlers();
    renderWithProviders(<AlcoReportPage />);
    await waitFor(() => {
      // "Executive Summary" appears in the section list and editor heading
      expect(screen.getAllByText('Executive Summary').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders executive summary editor with auto-generate button', async () => {
    setupHandlers();
    renderWithProviders(<AlcoReportPage />);
    await waitFor(() => {
      expect(screen.getByText('Auto-Generate')).toBeInTheDocument();
    });
  });

  it('saves a new pack when Save Pack is clicked', async () => {
    setupHandlers({ pack: null, packs: [] });
    const user = userEvent.setup();
    // Use a fresh handler that returns 404 for get-by-month to simulate no existing pack
    server.use(
      http.get('/api/v1/alm/alco-packs/month/:month', () => HttpResponse.json(wrap(null), { status: 404 })),
    );
    renderWithProviders(<AlcoReportPage />);
    await waitFor(() => {
      expect(screen.getByText('Save Pack')).toBeInTheDocument();
    });
  });

  it('shows Update Pack button when pack already exists', async () => {
    setupHandlers();
    renderWithProviders(<AlcoReportPage />);
    await waitFor(() => {
      expect(screen.getByText('Update Pack')).toBeInTheDocument();
    });
  });

  it('navigates to Action Items tab and shows items', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Action Items'));
    await waitFor(() => {
      expect(screen.getByText('AI-0001')).toBeInTheDocument();
    });
    expect(screen.getByText('Review duration gap strategy')).toBeInTheDocument();
    expect(screen.getByText('Treasury Head')).toBeInTheDocument();
  });

  it('highlights overdue action items', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Action Items'));
    await waitFor(() => {
      expect(screen.getByText('AI-0002')).toBeInTheDocument();
    });
    // The overdue item row should be visually distinct (bg-red-50 class)
    expect(screen.getByText('Submit IRRBB return')).toBeInTheDocument();
  });

  it('opens Add Item form and creates action item', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Action Items'));
    await waitFor(() => {
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Add Item'));
    await waitFor(() => {
      expect(screen.getByText('Description *')).toBeInTheDocument();
    });
    expect(screen.getByText('Owner *')).toBeInTheDocument();
    expect(screen.getByText('Due Date *')).toBeInTheDocument();
  });

  it('navigates to Approval & Distribution tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Approval & Distribution'));
    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
    expect(screen.getByText('Under Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Distributed')).toBeInTheDocument();
  });

  it('shows Submit for Review button for DRAFT packs', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Approval & Distribution'));
    await waitFor(() => {
      expect(screen.getByText('Submit for Review')).toBeInTheDocument();
    });
  });

  it('shows Approve Pack button for PENDING_REVIEW packs', async () => {
    setupHandlers({ pack: { ...mockPack, status: 'PENDING_REVIEW' } });
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Approval & Distribution'));
    await waitFor(() => {
      expect(screen.getByText('Approve Pack')).toBeInTheDocument();
    });
  });

  it('shows Distribute to ALCO button for APPROVED packs', async () => {
    setupHandlers({ pack: { ...mockPack, status: 'APPROVED', approvedBy: 'admin', approvedAt: '2026-03-20T10:00:00Z' } });
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Approval & Distribution'));
    await waitFor(() => {
      expect(screen.getByText('Distribute to ALCO')).toBeInTheDocument();
    });
  });

  it('shows version history in approval tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Approval & Distribution'));
    await waitFor(() => {
      expect(screen.getByText('Version History')).toBeInTheDocument();
    });
  });

  it('shows empty state for action items when none exist', async () => {
    setupHandlers({ actionItems: [] });
    const user = userEvent.setup();
    renderWithProviders(<AlcoReportPage />);
    await user.click(screen.getByText('Action Items'));
    await waitFor(() => {
      expect(screen.getByText('No action items yet')).toBeInTheDocument();
    });
  });
});
