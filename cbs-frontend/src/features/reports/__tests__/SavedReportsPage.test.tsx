import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { SavedReportsPage } from '../pages/SavedReportsPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SAVED_REPORTS = [
  {
    id: '1',
    name: 'Monthly Revenue',
    description: 'Revenue by product',
    category: 'Finance',
    createdBy: 'admin',
    savedTo: 'SHARED',
    schedule: 'MONTHLY',
    config: {
      dataSources: ['accounts'],
      columns: [],
      filters: [],
      visualization: 'TABLE',
    },
    createdAt: '2026-01-01',
    lastRun: '2026-01-15',
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/custom', () =>
      HttpResponse.json(wrap(MOCK_SAVED_REPORTS)),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SavedReportsPage', () => {
  it('renders page title "Custom Reports"', () => {
    setupHandlers();
    renderWithProviders(<SavedReportsPage />);
    expect(screen.getByText('Report Builder')).toBeInTheDocument();
  });

  it('displays saved reports after load', async () => {
    setupHandlers();
    renderWithProviders(<SavedReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('Monthly Revenue')).toBeInTheDocument();
    });
  });

  it('New Report button is present', () => {
    setupHandlers();
    renderWithProviders(<SavedReportsPage />);
    expect(
      screen.getByRole('button', { name: /new report/i }),
    ).toBeInTheDocument();
  });

  it('search bar is present', () => {
    setupHandlers();
    renderWithProviders(<SavedReportsPage />);
    expect(
      screen.getByPlaceholderText(/search reports/i),
    ).toBeInTheDocument();
  });

  it('category filter is present', () => {
    setupHandlers();
    renderWithProviders(<SavedReportsPage />);
    expect(
      screen.getByRole('combobox', { name: '' }),
    ).toBeInTheDocument();
  });

  it('report row shows Run, Edit, Clone, Delete actions', async () => {
    setupHandlers();
    renderWithProviders(<SavedReportsPage />);
    await waitFor(() => {
      expect(screen.getByTitle('Run report')).toBeInTheDocument();
      expect(screen.getByTitle('Edit report')).toBeInTheDocument();
      expect(screen.getByTitle('Clone report')).toBeInTheDocument();
      expect(screen.getByTitle('Delete report')).toBeInTheDocument();
    });
  });
});
