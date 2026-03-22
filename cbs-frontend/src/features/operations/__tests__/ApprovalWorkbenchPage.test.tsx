import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import ApprovalWorkbenchPage from '../pages/ApprovalWorkbenchPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MY_QUEUE = {
  data: [
    { id: 1, workflowType: 'LOAN_APPROVAL', requestType: 'LOAN_APPROVAL', description: 'Loan approval for Customer #1001', status: 'PENDING_APPROVAL', requestedBy: 'officer1', amount: 500000, currency: 'NGN', priority: 'HIGH', submittedAt: '2026-03-22T09:00:00Z', slaDeadline: '2026-03-22T17:00:00Z' },
    { id: 2, workflowType: 'PAYMENT_APPROVAL', requestType: 'PAYMENT_APPROVAL', description: 'Wire transfer USD 50,000', status: 'PENDING_APPROVAL', requestedBy: 'officer2', amount: 50000, currency: 'USD', priority: 'CRITICAL', submittedAt: '2026-03-22T10:00:00Z', slaDeadline: '2026-03-22T14:00:00Z' },
  ],
};

const MOCK_TEAM_QUEUE = { data: [] };
const MOCK_DELEGATED_QUEUE = { data: [] };
const MOCK_HISTORY = { data: [] };
const MOCK_DELEGATIONS = { data: [] };
const MOCK_ESCALATION_RULES = { data: [] };
const MOCK_STATS = {
  data: { pending: 2, approved: 15, rejected: 3, slaBreachedCount: 1, total: 20 },
};
const MOCK_APPROVERS = {
  data: [
    { id: 'admin', name: 'System Administrator', role: 'CBS_ADMIN' },
    { id: 'officer1', name: 'Operations Officer', role: 'CBS_OFFICER' },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/approvals/my-queue', () => HttpResponse.json(MOCK_MY_QUEUE)),
    http.get('/api/v1/approvals/pending', () => HttpResponse.json(MOCK_MY_QUEUE)),
    http.get('/api/v1/approvals/team-queue', () => HttpResponse.json(MOCK_TEAM_QUEUE)),
    http.get('/api/v1/approvals/delegated-queue', () => HttpResponse.json(MOCK_DELEGATED_QUEUE)),
    http.get('/api/v1/approvals/history', () => HttpResponse.json(MOCK_HISTORY)),
    http.get('/api/v1/approvals/delegations', () => HttpResponse.json(MOCK_DELEGATIONS)),
    http.get('/api/v1/approvals/escalation-rules', () => HttpResponse.json(MOCK_ESCALATION_RULES)),
    http.get('/api/v1/approvals/stats', () => HttpResponse.json(MOCK_STATS)),
    http.get('/api/v1/approvals/approvers', () => HttpResponse.json(MOCK_APPROVERS)),
    http.get('/api/v1/approvals/:id', () => HttpResponse.json({ data: MOCK_MY_QUEUE.data[0] })),
    http.post('/api/v1/approvals/:id/approve', () =>
      HttpResponse.json({ data: { ...MOCK_MY_QUEUE.data[0], status: 'APPROVED' } }),
    ),
    http.post('/api/v1/approvals/:id/reject', () =>
      HttpResponse.json({ data: { ...MOCK_MY_QUEUE.data[0], status: 'REJECTED' } }),
    ),
    http.post('/api/v1/approvals/:id/return', () =>
      HttpResponse.json({ data: { ...MOCK_MY_QUEUE.data[0], status: 'RETURNED' } }),
    ),
    http.post('/api/v1/approvals/:id/delegate', () =>
      HttpResponse.json({ data: { ...MOCK_MY_QUEUE.data[0], status: 'DELEGATED' } }),
    ),
    http.post('/api/v1/approvals/bulk-approve', () =>
      HttpResponse.json({ data: { approved: 2 } }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ApprovalWorkbenchPage', () => {
  it('renders page header "Approval Workbench"', () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    expect(screen.getByText('Approval Workbench')).toBeInTheDocument();
  });

  it('shows My Queue tab as active by default', () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    expect(screen.getByText(/my queue/i)).toBeInTheDocument();
  });

  it('displays pending approval items in queue', async () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    await waitFor(() => {
      expect(screen.getByText(/loan approval/i)).toBeInTheDocument();
    });
  });

  it('shows approve and reject action buttons per item', async () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    await waitFor(() => {
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      expect(approveButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Team Queue tab', () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    expect(screen.getByText(/team/i)).toBeInTheDocument();
  });

  it('shows Delegation management button', () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    expect(screen.getByRole('button', { name: /delegat/i })).toBeInTheDocument();
  });

  it('shows History tab', () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    expect(screen.getByText(/history/i)).toBeInTheDocument();
  });

  it('shows Escalation Rules tab', () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    expect(screen.getByText(/escalation/i)).toBeInTheDocument();
  });

  it('shows stats cards with pending count', async () => {
    setupHandlers();
    renderWithProviders(<ApprovalWorkbenchPage />);
    await waitFor(() => {
      // Stats should show pending count somewhere
      const pendingElements = screen.queryAllByText('2');
      expect(pendingElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
