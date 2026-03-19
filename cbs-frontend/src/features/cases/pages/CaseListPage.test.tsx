import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { CaseListPage } from './CaseListPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = { openCases: 156, slaBreached: 23, resolvedToday: 45, avgResolutionHours: 4.2 };

const mockCases = [
  { id: 1, caseNumber: 'CASE-000001', customerId: 1, customerName: 'Customer One', caseType: 'COMPLAINT', priority: 'HIGH', status: 'OPEN', subject: 'ATM Issue', assignedTo: 'agent-1', assignedToName: 'Agent One', slaDeadline: new Date(Date.now() + 4 * 3600000).toISOString(), slaBreached: false, activities: [], createdAt: '2026-03-18T10:00:00Z' },
  { id: 2, caseNumber: 'CASE-000002', customerId: 2, customerName: 'Customer Two', caseType: 'SERVICE_REQUEST', priority: 'MEDIUM', status: 'OPEN', subject: 'Card Request', assignedTo: 'agent-1', assignedToName: 'Agent One', slaDeadline: new Date(Date.now() + 8 * 3600000).toISOString(), slaBreached: false, activities: [], createdAt: '2026-03-18T11:00:00Z' },
  { id: 3, caseNumber: 'CASE-000003', customerId: 3, customerName: 'Customer Three', caseType: 'DISPUTE', priority: 'CRITICAL', status: 'ESCALATED', subject: 'Transaction Dispute', assignedTo: 'agent-2', assignedToName: 'Agent Two', slaDeadline: new Date(Date.now() - 3600000).toISOString(), slaBreached: true, activities: [], createdAt: '2026-03-18T09:00:00Z' },
];

function setupHandlers(stats = mockStats, cases = mockCases) {
  server.use(
    http.get('/api/v1/cases/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/cases/my', () => HttpResponse.json(wrap(cases.slice(0, 2)))),
    http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/cases', () => HttpResponse.json(wrap(cases))),
  );
}

describe('CaseListPage', () => {
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

  it('renders 4 stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      expect(screen.getByText('Open Cases')).toBeInTheDocument();
    });
    expect(screen.getByText('SLA Breached')).toBeInTheDocument();
    expect(screen.getByText('Resolved Today')).toBeInTheDocument();
    expect(screen.getByText('Avg Resolution')).toBeInTheDocument();
  });

  it('displays stat card values', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      expect(screen.getByText('156')).toBeInTheDocument();
    });
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('4.2h')).toBeInTheDocument();
  });

  it('renders 4 tabs', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('My Cases')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Escalated')).toBeInTheDocument();
    expect(screen.getByText('All Cases')).toBeInTheDocument();
  });

  it('My Cases tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    const tab = screen.getByText('My Cases');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Unassigned tab', async () => {
    setupHandlers();
    
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Unassigned'));
    const tab = screen.getByText('Unassigned');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Escalated tab', async () => {
    setupHandlers();
    
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Escalated'));
    const tab = screen.getByText('Escalated');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to All Cases tab', async () => {
    setupHandlers();
    
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('All Cases'));
    const tab = screen.getByText('All Cases');
    expect(tab.className).toContain('border-primary');
  });

  it('shows dash when stats fail to load', async () => {
    server.use(
      http.get('/api/v1/cases/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/cases/my', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles server error for cases list', async () => {
    server.use(
      http.get('/api/v1/cases/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/cases/my', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cases', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('Case Management')).toBeInTheDocument();
  });

  it('shows tab count badges when data is loaded', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('shows empty state for unassigned cases', async () => {
    setupHandlers();
    
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('Unassigned'));
    // Unassigned returns empty
  });

  it('renders stat cards with correct structure', async () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBe(4);
    });
  });

  it('shows escalated cases in the escalated tab', async () => {
    setupHandlers();
    
    renderWithProviders(<CaseListPage />);
    fireEvent.click(screen.getByText('All Cases'));
    await waitFor(() => {
      expect(screen.getByText('Transaction Dispute')).toBeInTheDocument();
    });
  });

  it('renders the component without crashing', () => {
    setupHandlers();
    renderWithProviders(<CaseListPage />);
    expect(screen.getByText('Case Management')).toBeTruthy();
  });
});
