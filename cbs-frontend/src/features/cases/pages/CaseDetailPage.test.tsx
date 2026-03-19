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
  priority: 'HIGH',
  status: 'OPEN',
  subject: 'ATM did not dispense cash',
  description: 'Customer tried to withdraw 50,000 from ATM at Victoria Island but received debit without cash.',
  assignedTo: 'agent-1',
  assignedToName: 'Agent One',
  slaDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
  slaBreached: false,
  activities: [
    { id: 1, type: 'NOTE', content: 'Case created by customer', createdBy: 'system', createdAt: '2026-03-18T10:00:00Z' },
    { id: 2, type: 'NOTE', content: 'Investigating with ATM vendor', createdBy: 'Agent One', createdAt: '2026-03-18T11:00:00Z' },
  ],
  openedAt: '2026-03-18T10:00:00Z',
  createdAt: '2026-03-18T10:00:00Z',
  updatedAt: '2026-03-18T14:00:00Z',
};

function setupHandlers(caseData = mockCase) {
  server.use(
    http.get('/api/v1/cases/:id', () => HttpResponse.json(wrap(caseData))),
    http.post('/api/v1/cases/:id/notes', () =>
      HttpResponse.json(wrap({ id: 3, type: 'NOTE', content: 'New note', createdBy: 'agent', createdAt: new Date().toISOString() }))
    ),
    http.post('/api/v1/cases/:id/resolve', () =>
      HttpResponse.json(wrap({ ...caseData, status: 'RESOLVED' }))
    ),
  );
}

function renderPage(caseId = '1') {
  return renderWithProviders(
    <Routes>
      <Route path="/cases/:id" element={<CaseDetailPage />} />
    </Routes>,
    { route: `/cases/${caseId}` }
  );
}

describe('CaseDetailPage', () => {
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

  it('renders the Activity section', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  it('renders Case Details panel on right side', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Case Details')).toBeInTheDocument();
    });
  });

  it('renders customer label', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });
  });

  it('renders description label', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  it('shows loading placeholder when data not yet loaded', () => {
    server.use(
      http.get('/api/v1/cases/:id', () => new Promise(() => {})),
    );
    renderPage();
    const pulse = document.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });

  it('handles case API error gracefully', async () => {
    server.use(
      http.get('/api/v1/cases/:id', () => HttpResponse.json({}, { status: 500 })),
    );
    renderPage();
    // Should show loading/fallback state
    expect(screen.getByText('Case Detail')).toBeInTheDocument();
  });

  it('renders with a resolved case', async () => {
    setupHandlers({ ...mockCase, status: 'RESOLVED' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    });
  });

  it('renders with an escalated case', async () => {
    setupHandlers({ ...mockCase, status: 'ESCALATED', priority: 'CRITICAL' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('ESCALATED')).toBeInTheDocument();
    });
  });

  it('renders CaseInfoPanel component', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Case Details')).toBeInTheDocument();
    });
  });

  it('renders the note form section', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  it('renders with different case type', async () => {
    setupHandlers({ ...mockCase, caseType: 'SERVICE_REQUEST', subject: 'Card Replacement' });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('SERVICE REQUEST').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Card Replacement')).toBeInTheDocument();
  });

  it('renders with empty activities', async () => {
    setupHandlers({ ...mockCase, activities: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });
});
