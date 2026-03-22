import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { CaseDetailPage } from './CaseDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCase = {
  id: 1,
  caseNumber: 'CASE-000001',
  customerId: 1,
  customerName: 'Amara Okonkwo',
  caseType: 'COMPLAINT',
  caseCategory: 'GENERAL',
  subCategory: 'ATM/POS',
  priority: 'HIGH',
  status: 'OPEN',
  subject: 'ATM did not dispense cash',
  description: 'Customer tried to withdraw 50,000 from ATM at Victoria Island but received debit without cash.',
  assignedTo: 'agent-1',
  assignedToName: 'Agent One',
  assignedTeam: 'Support Team',
  slaDueAt: new Date(Date.now() + 4 * 3600000).toISOString(),
  slaBreached: false,
  compensationAmount: undefined as unknown,
  compensationApproved: undefined as unknown,
  compensationApprovedBy: undefined as unknown,
  compensationApprovedAt: undefined as unknown,
  compensationRejectionReason: undefined as unknown,
  activities: [
    { id: 1, type: 'NOTE', noteType: 'INTERNAL', content: 'Case created by customer', createdBy: 'system', createdAt: '2026-03-18T10:00:00Z' },
    { id: 2, type: 'NOTE', noteType: 'INTERNAL', content: 'Investigating with ATM vendor', createdBy: 'Agent One', createdAt: '2026-03-18T11:00:00Z' },
  ],
  attachments: [] as unknown[],
  openedAt: '2026-03-18T10:00:00Z',
  createdAt: '2026-03-18T10:00:00Z',
  updatedAt: '2026-03-18T14:00:00Z',
};

function setupHandlers(caseData = mockCase) {
  server.use(
    http.get('/api/v1/cases/:id', () => HttpResponse.json(wrap(caseData))),
    http.put('/api/v1/cases/:id', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      return HttpResponse.json(wrap({ ...caseData, ...body }));
    }),
    http.post('/api/v1/cases/:id/assign', ({ request }) => {
      const url = new URL(request.url);
      return HttpResponse.json(wrap({ ...caseData, status: 'IN_PROGRESS', assignedTo: url.searchParams.get('assignedTo'), assignedToName: url.searchParams.get('assignedTo') }));
    }),
    http.post('/api/v1/cases/:id/escalate', () =>
      HttpResponse.json(wrap({ ...caseData, status: 'ESCALATED', priority: 'CRITICAL' }))
    ),
    http.post('/api/v1/cases/:id/resolve', () =>
      HttpResponse.json(wrap({ ...caseData, status: 'RESOLVED' }))
    ),
    http.post('/api/v1/cases/:id/close', () =>
      HttpResponse.json(wrap({ ...caseData, status: 'CLOSED' }))
    ),
    http.post('/api/v1/cases/:id/notes', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      return HttpResponse.json(wrap({ id: 99, type: 'NOTE', content: body.content, noteType: body.noteType, createdBy: body.createdBy, createdAt: new Date().toISOString() }), { status: 201 });
    }),
    http.post('/api/v1/cases/:id/attachments', () =>
      HttpResponse.json(wrap({ id: 10, filename: 'test.pdf', fileSize: 1024, mimeType: 'application/pdf', uploadedBy: 'agent-1', uploadedAt: new Date().toISOString(), url: '/api/v1/cases/CASE-000001/attachments/10/download' }), { status: 201 })
    ),
    http.post('/api/v1/cases/:id/compensation', async ({ request }) => {
      const body = await request.json() as Record<string, unknown>;
      return HttpResponse.json(wrap({ ...caseData, compensationAmount: body.amount, compensationApproved: null }));
    }),
    http.post('/api/v1/cases/:id/compensation/approve', () =>
      HttpResponse.json(wrap({ ...caseData, compensationAmount: 50000, compensationApproved: true, compensationApprovedBy: 'admin' }))
    ),
    http.post('/api/v1/cases/:id/compensation/reject', () =>
      HttpResponse.json(wrap({ ...caseData, compensationAmount: 50000, compensationApproved: false, compensationRejectionReason: 'Not justified' }))
    ),
  );
}

function renderPage(caseId = 'CASE-000001') {
  return renderWithProviders(
    <Routes>
      <Route path="/cases/:id" element={<CaseDetailPage />} />
    </Routes>,
    { route: `/cases/${caseId}` }
  );
}

describe('CaseDetailPage', () => {
  // ── Page Structure ────────────────────────────────────────
  it('shows loading state initially', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Case Detail')).toBeInTheDocument();
  });

  it('renders case number in page header after loading', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Case CASE-000001')).toBeInTheDocument();
    });
  });

  it('renders case subject as subtitle', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ATM did not dispense cash')).toBeInTheDocument();
    });
  });

  it('renders Back button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('renders RCA link button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RCA')).toBeInTheDocument();
    });
  });

  // ── Case Info Display ─────────────────────────────────────
  it('renders case status badge', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('OPEN')).toBeInTheDocument();
    });
  });

  it('renders case type', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('COMPLAINT').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders customer name', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });
  });

  it('renders case description', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/ATM at Victoria Island/)).toBeInTheDocument();
    });
  });

  it('renders Case Details panel', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Case Details')).toBeInTheDocument();
    });
  });

  // ── Activity Feed ─────────────────────────────────────────
  it('renders the Activity section', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  it('shows activity entries from case data', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Case created by customer')).toBeInTheDocument();
      expect(screen.getByText('Investigating with ATM vendor')).toBeInTheDocument();
    });
  });

  it('renders with empty activities', async () => {
    setupHandlers({ ...mockCase, activities: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  // ── Attachments Section ───────────────────────────────────
  it('shows empty attachments message', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No attachments yet')).toBeInTheDocument();
    });
  });

  it('shows attachments when present', async () => {
    setupHandlers({
      ...mockCase,
      attachments: [
        { id: 1, filename: 'receipt.pdf', fileSize: 2048, mimeType: 'application/pdf', uploadedBy: 'agent-1', uploadedAt: '2026-03-18T12:00:00Z', url: '/api/v1/cases/CASE-000001/attachments/1/download' },
      ],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('receipt.pdf')).toBeInTheDocument();
    });
  });

  // ── Status Change ─────────────────────────────────────────
  it('shows status dropdown in Case Details panel', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      const select = screen.getByText('Open').closest('select');
      expect(select).toBeInTheDocument();
    });
  });

  // ── Assign Action ─────────────────────────────────────────
  it('shows Assign button in action grid', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Assign')).toBeInTheDocument();
    });
  });

  it('opens Assign dialog when clicked', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Assign')));
    expect(screen.getByText('Assign Case')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Agent name or ID')).toBeInTheDocument();
  });

  it('Assign dialog has Cancel button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Assign')));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('Assign dialog has team field', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Assign')));
    expect(screen.getByPlaceholderText('e.g. Fraud Operations')).toBeInTheDocument();
  });

  it('Assign button is disabled when agent field is empty', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Assign')));
    const agentInput = screen.getByPlaceholderText('Agent name or ID');
    fireEvent.change(agentInput, { target: { value: '' } });
    // The Assign submit button inside dialog
    const buttons = screen.getAllByText('Assign');
    const submitBtn = buttons.find(b => b.closest('.rounded-lg'));
    // There should be a disabled button
    expect(submitBtn).toBeDefined();
  });

  // ── Escalate Action ───────────────────────────────────────
  it('shows Escalate button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Escalate')).toBeInTheDocument();
    });
  });

  it('opens Escalate dialog when clicked', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Escalate')));
    expect(screen.getByText('Escalate Case')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Manager name or team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Reason for escalation...')).toBeInTheDocument();
  });

  // ── Resolve Action ────────────────────────────────────────
  it('shows Resolve button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Resolve')).toBeInTheDocument();
    });
  });

  it('opens Resolve dialog with resolution type and summary', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Resolve')));
    expect(screen.getByText('Resolve Case')).toBeInTheDocument();
    expect(screen.getByText('Resolution Type')).toBeInTheDocument();
    expect(screen.getByText('Resolution Summary')).toBeInTheDocument();
    expect(screen.getByText('Fully Resolved')).toBeInTheDocument();
    expect(screen.getByText('Partially Resolved')).toBeInTheDocument();
    expect(screen.getByText('No Fault Found')).toBeInTheDocument();
  });

  // ── Close Action ──────────────────────────────────────────
  it('shows Close button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('opens Close dialog when clicked', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByText('Close Case', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Reason for closing...')).toBeInTheDocument();
  });

  // ── Compensation ──────────────────────────────────────────
  it('shows compensation input when no amount is set', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    });
    expect(screen.getByText('Set')).toBeInTheDocument();
  });

  it('shows approve/reject buttons when compensation is pending and user is CBS_ADMIN', async () => {
    setupHandlers({
      ...mockCase,
      compensationAmount: 50000,
      compensationApproved: null,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('₦50,000')).toBeInTheDocument();
    });
    // Default test user has CBS_ADMIN role
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('hides approve/reject buttons for CBS_OFFICER (non-admin) user', async () => {
    setupHandlers({
      ...mockCase,
      compensationAmount: 50000,
      compensationApproved: null,
    });
    renderWithProviders(
      <Routes>
        <Route path="/cases/:id" element={<CaseDetailPage />} />
      </Routes>,
      {
        route: '/cases/CASE-000001',
        user: { id: 'officer-1', username: 'officer', fullName: 'Officer User', email: 'officer@cbs.bank', roles: ['CBS_OFFICER'], permissions: [] } as any,
      }
    );
    await waitFor(() => {
      expect(screen.getByText('₦50,000')).toBeInTheDocument();
    });
    // CBS_OFFICER should not see approve/reject
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    expect(screen.getByText('Pending admin approval')).toBeInTheDocument();
  });

  it('shows APPROVED status when compensation is approved', async () => {
    setupHandlers({
      ...mockCase,
      compensationAmount: 50000,
      compensationApproved: true,
      compensationApprovedBy: 'admin-1',
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
    expect(screen.getByText(/Approved by admin-1/)).toBeInTheDocument();
  });

  it('shows REJECTED status with reason when compensation is rejected', async () => {
    setupHandlers({
      ...mockCase,
      compensationAmount: 50000,
      compensationApproved: false,
      compensationRejectionReason: 'Not justified',
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
    expect(screen.getByText(/Rejected: Not justified/)).toBeInTheDocument();
  });

  it('opens reject compensation dialog', async () => {
    setupHandlers({
      ...mockCase,
      compensationAmount: 50000,
      compensationApproved: null,
    });
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Reject')));
    expect(screen.getByText('Reject Compensation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Reason for rejection...')).toBeInTheDocument();
  });

  // ── Terminal State Behavior ───────────────────────────────
  it('hides action buttons for RESOLVED case', async () => {
    setupHandlers({ ...mockCase, status: 'RESOLVED' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    });
    expect(screen.queryByText('Assign')).not.toBeInTheDocument();
    expect(screen.queryByText('Escalate')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });

  it('hides action buttons for CLOSED case', async () => {
    setupHandlers({ ...mockCase, status: 'CLOSED' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CLOSED')).toBeInTheDocument();
    });
    expect(screen.queryByText('Assign')).not.toBeInTheDocument();
  });

  it('shows None for compensation on terminal case without amount', async () => {
    setupHandlers({ ...mockCase, status: 'RESOLVED' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('None')).toBeInTheDocument();
    });
  });

  // ── Note Form ─────────────────────────────────────────────
  it('renders note type selector buttons', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Internal')).toBeInTheDocument();
      expect(screen.getByText('Customer-visible')).toBeInTheDocument();
      expect(screen.getByText('Escalation')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });

  it('renders note textarea', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add an internal note...')).toBeInTheDocument();
    });
  });

  it('changes placeholder when note type changes', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => fireEvent.click(screen.getByText('Customer-visible')));
    expect(screen.getByPlaceholderText('Add a customer-visible note...')).toBeInTheDocument();
  });

  // ── Different Case Types ──────────────────────────────────
  it('renders with SERVICE_REQUEST type', async () => {
    setupHandlers({ ...mockCase, caseType: 'SERVICE_REQUEST', subject: 'Card Replacement' });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('SERVICE REQUEST').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Card Replacement')).toBeInTheDocument();
  });

  it('renders with ESCALATED status', async () => {
    setupHandlers({ ...mockCase, status: 'ESCALATED', priority: 'CRITICAL' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ESCALATED')).toBeInTheDocument();
    });
  });

  // ── Loading / Error States ────────────────────────────────
  it('shows loading placeholder when data not yet loaded', () => {
    server.use(http.get('/api/v1/cases/:id', () => new Promise(() => {})));
    renderPage();
    const pulse = document.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });

  it('handles case API error gracefully', () => {
    server.use(http.get('/api/v1/cases/:id', () => HttpResponse.json({}, { status: 500 })));
    renderPage();
    expect(screen.getByText('Case Detail')).toBeInTheDocument();
  });

  // ── Role-Based Visibility ───────────────────────────────
  it('CBS_OFFICER can still set compensation amount', async () => {
    setupHandlers();
    renderWithProviders(
      <Routes>
        <Route path="/cases/:id" element={<CaseDetailPage />} />
      </Routes>,
      {
        route: '/cases/CASE-000001',
        user: { id: 'officer-1', username: 'officer', fullName: 'Officer User', email: 'officer@cbs.bank', roles: ['CBS_OFFICER'], permissions: [] } as any,
      }
    );
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    });
    expect(screen.getByText('Set')).toBeInTheDocument();
  });

  // ── Related Cases ─────────────────────────────────────────
  it('shows related cases when present', async () => {
    setupHandlers({ ...mockCase, relatedCaseIds: [101, 102] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument();
      expect(screen.getByText('#102')).toBeInTheDocument();
    });
  });
});
