import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import OpenItemsPage from '../pages/OpenItemsPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_OPEN_ITEMS = {
  data: [
    { id: 1, itemCode: 'OI-001', itemType: 'RECON_BREAK', itemCategory: 'NOSTRO', description: 'Unmatched debit on nostro USD', referenceNumber: 'TXN-123456', currency: 'USD', amount: 15000, valueDate: '2026-03-20', agingDays: 2, assignedTo: 'ops_team', assignedTeam: 'Operations', priority: 'HIGH', status: 'OPEN' },
    { id: 2, itemCode: 'OI-002', itemType: 'SUSPENSE', itemCategory: 'SUSPENSE', description: 'Unknown credit to suspense account', referenceNumber: 'TXN-789012', currency: 'NGN', amount: 250000, valueDate: '2026-03-19', agingDays: 3, assignedTo: null, assignedTeam: null, priority: 'MEDIUM', status: 'OPEN' },
    { id: 3, itemCode: 'OI-003', itemType: 'EXCEPTION', itemCategory: 'PAYMENTS', description: 'Failed outbound payment reversal', referenceNumber: 'PAY-456789', currency: 'EUR', amount: 8500, valueDate: '2026-03-15', agingDays: 7, assignedTo: 'john.doe', assignedTeam: 'Payments', priority: 'HIGH', status: 'ASSIGNED' },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/open-items', () => HttpResponse.json(MOCK_OPEN_ITEMS)),
    http.get('/api/v1/open-items/open', () => HttpResponse.json(MOCK_OPEN_ITEMS)),
    http.post('/api/v1/open-items', () =>
      HttpResponse.json({ data: MOCK_OPEN_ITEMS.data[0] }, { status: 201 }),
    ),
    http.post('/api/v1/open-items/:code/assign', () =>
      HttpResponse.json({ data: { ...MOCK_OPEN_ITEMS.data[1], assignedTo: 'ops_team', status: 'ASSIGNED' } }),
    ),
    http.post('/api/v1/open-items/:code/resolve', () =>
      HttpResponse.json({ data: { ...MOCK_OPEN_ITEMS.data[0], status: 'RESOLVED', resolutionAction: 'CORRECTED' } }),
    ),
    http.post('/api/v1/open-items/:code/escalate', () =>
      HttpResponse.json({ data: { ...MOCK_OPEN_ITEMS.data[0], priority: 'CRITICAL' } }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OpenItemsPage', () => {
  it('renders page header "Open Items"', () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    expect(screen.getByText(/open items/i)).toBeInTheDocument();
  });

  it('displays open items in a table', async () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    await waitFor(() => {
      expect(screen.getByText('OI-001')).toBeInTheDocument();
      expect(screen.getByText('OI-002')).toBeInTheDocument();
    });
  });

  it('shows Create Item button', () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    expect(screen.getByRole('button', { name: /create|new|add/i })).toBeInTheDocument();
  });

  it('shows assign action for unassigned items', async () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    await waitFor(() => {
      const assignButtons = screen.getAllByRole('button', { name: /assign/i });
      expect(assignButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows resolve action for assigned items', async () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    await waitFor(() => {
      const resolveButtons = screen.getAllByRole('button', { name: /resolve/i });
      expect(resolveButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows escalate action', async () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    await waitFor(() => {
      const escalateButtons = screen.getAllByRole('button', { name: /escalate/i });
      expect(escalateButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays aging days with appropriate styling', async () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument(); // 7 days aging
    });
  });

  it('shows priority badges', async () => {
    setupHandlers();
    renderWithProviders(<OpenItemsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/HIGH/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
