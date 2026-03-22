import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { CaseListPage } from './CaseListPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = { openCases: 156, slaBreached: 23, resolvedToday: 45, avgResolutionHours: 4.2 };

const mockCases = [
  { id: 1, caseNumber: 'CASE-000001', customerId: 1, customerName: 'Customer One', caseType: 'COMPLAINT', priority: 'HIGH', status: 'OPEN', subject: 'ATM Issue', description: 'ATM did not dispense cash', assignedTo: 'agent-1', assignedToName: 'Agent One', slaDueAt: new Date(Date.now() + 4 * 3600000).toISOString(), slaBreached: false, activities: [], createdAt: '2026-03-18T10:00:00Z', updatedAt: '2026-03-18T10:00:00Z', openedAt: '2026-03-18T10:00:00Z' },
  { id: 2, caseNumber: 'CASE-000002', customerId: 2, customerName: 'Customer Two', caseType: 'SERVICE_REQUEST', priority: 'MEDIUM', status: 'OPEN', subject: 'Card Request', description: 'Request for new debit card', assignedTo: 'agent-1', assignedToName: 'Agent One', slaDueAt: new Date(Date.now() + 8 * 3600000).toISOString(), slaBreached: false, activities: [], createdAt: '2026-03-18T11:00:00Z', updatedAt: '2026-03-18T11:00:00Z', openedAt: '2026-03-18T11:00:00Z' },
  { id: 3, caseNumber: 'CASE-000003', customerId: 3, customerName: 'Customer Three', caseType: 'DISPUTE', priority: 'CRITICAL', status: 'ESCALATED', subject: 'Transaction Dispute', description: 'Unauthorized transaction on account', assignedTo: 'agent-2', assignedToName: 'Agent Two', slaDueAt: new Date(Date.now() - 3600000).toISOString(), slaBreached: true, activities: [], createdAt: '2026-03-18T09:00:00Z', updatedAt: '2026-03-18T09:00:00Z', openedAt: '2026-03-18T09:00:00Z' },
];

function setupHandlers(stats = mockStats, cases = mockCases) {
  server.use(
    http.get('/api/v1/cases/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/cases/my', () => HttpResponse.json(wrap(cases.slice(0, 2)))),
    http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/cases/escalated', () => HttpResponse.json(wrap(cases.filter(c => c.status === 'ESCALATED')))),
    http.get('/api/v1/cases/sla-breached', () => HttpResponse.json(wrap(cases.filter(c => c.slaBreached)))),
    http.get('/api/v1/cases', () => HttpResponse.json(wrap(cases))),
  );
}

describe('CaseListPage', () => {
  // ── Page Structure ────────────────────────────────────────
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('Case Management')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText(/create, track and resolve/i)).toBeInTheDocument();
  });

  it('renders New Case button', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('New Case')).toBeInTheDocument();
  });

  it('renders RCA Dashboard button', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('RCA Dashboard')).toBeInTheDocument();
  });

  it('renders Filters toggle button', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  // ── Stat Cards ────────────────────────────────────────────
  it('renders 4 stat cards with correct labels', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      expect(screen.getByText('Open Cases')).toBeInTheDocument();
    });
    expect(screen.getAllByText('SLA Breached').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Resolved Today')).toBeInTheDocument();
    expect(screen.getByText('Avg Resolution')).toBeInTheDocument();
  });

  it('displays stat card values from API', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent === '156')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText((_, el) => el?.textContent === '23')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent === '45')).toBeInTheDocument();
    expect(screen.getByText('4.2h')).toBeInTheDocument();
  });

  it('shows dash when stats fail to load', async () => {
    server.use(
      http.get('/api/v1/cases/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/cases/my', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases/escalated', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases/sla-breached', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Tabs ──────────────────────────────────────────────────
  it('renders 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('My Cases')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Escalated')).toBeInTheDocument();
    expect(screen.getAllByText('SLA Breached').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('All Cases')).toBeInTheDocument();
  });

  it('My Cases tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    const tab = screen.getByText('My Cases');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Unassigned tab', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Unassigned'));
    expect(screen.getByText('Unassigned').className).toContain('border-primary');
  });

  it('can switch to Escalated tab', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Escalated'));
    expect(screen.getByText('Escalated').className).toContain('border-primary');
  });

  it('can switch to All Cases tab', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('All Cases'));
    expect(screen.getByText('All Cases').className).toContain('border-primary');
  });

  it('shows tab count badges when data is loaded', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  // ── Data Display ──────────────────────────────────────────
  it('shows cases in All Cases tab', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('All Cases'));
    await waitFor(() => {
      expect(screen.getByText('Customer Three')).toBeInTheDocument();
    });
  });

  it('handles server error for cases list', () => {
    server.use(
      http.get('/api/v1/cases/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/cases/my', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases/escalated', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases/sla-breached', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('Case Management')).toBeInTheDocument();
  });

  // ── Filter Panel ──────────────────────────────────────────
  it('toggles filter panel on button click', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.queryByText('Filter Cases')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Filter Cases')).toBeInTheDocument();
  });

  it('shows 6 filter fields when panel is open', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
  });

  it('can type in search filter', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const input = screen.getByPlaceholderText('Case #, customer, subject');
    fireEvent.change(input, { target: { value: 'ATM' } });
    expect(input).toHaveValue('ATM');
  });

  it('can select case type filter', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const typeSelect = screen.getByText('All types').closest('select')!;
    fireEvent.change(typeSelect, { target: { value: 'COMPLAINT' } });
    expect(typeSelect).toHaveValue('COMPLAINT');
  });

  it('can select priority filter', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const select = screen.getByText('All priorities').closest('select')!;
    fireEvent.change(select, { target: { value: 'HIGH' } });
    expect(select).toHaveValue('HIGH');
  });

  it('can select status filter', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const select = screen.getByText('All statuses').closest('select')!;
    fireEvent.change(select, { target: { value: 'OPEN' } });
    expect(select).toHaveValue('OPEN');
  });

  it('shows clear all button when filters are active', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const input = screen.getByPlaceholderText('Case #, customer, subject');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('clears all filters when Clear all is clicked', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const input = screen.getByPlaceholderText('Case #, customer, subject');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByText('Clear all'));
    expect(input).toHaveValue('');
  });

  it('shows active filter count badge on Filters button', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const input = screen.getByPlaceholderText('Case #, customer, subject');
    fireEvent.change(input, { target: { value: 'test' } });
    // The badge shows count of active filters
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  // ── Filter options include all backend-supported values ───
  it('type filter has all 15 case types', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const typeSelect = screen.getByText('All types').closest('select')!;
    expect(typeSelect.querySelectorAll('option').length).toBe(16); // 15 types + "All types"
  });

  it('status filter has all status values', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const select = screen.getByText('All statuses').closest('select')!;
    expect(select.querySelectorAll('option').length).toBeGreaterThanOrEqual(8);
  });

  // ── Renders without crashing ──────────────────────────────
  it('renders the component without crashing', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('Case Management')).toBeTruthy();
  });
});
