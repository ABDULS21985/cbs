import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { CustomReportBuilderPage } from '../pages/CustomReportBuilderPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DATA_SOURCES = [
  {
    id: 'customers',
    name: 'Customers',
    category: 'Banking Data',
    fields: [
      {
        id: 'cifNumber',
        name: 'cifNumber',
        displayName: 'CIF Number',
        type: 'TEXT',
        aggregatable: false,
        filterable: true,
        groupable: true,
      },
    ],
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/custom/data-sources', () =>
      HttpResponse.json(wrap(MOCK_DATA_SOURCES)),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CustomReportBuilderPage', () => {
  it('renders step 1 (Data Source)', () => {
    setupHandlers();
    renderWithProviders(<CustomReportBuilderPage />);
    expect(screen.getByText('Select Data Sources')).toBeInTheDocument();
  });

  it('shows data source cards', async () => {
    setupHandlers();
    renderWithProviders(<CustomReportBuilderPage />);
    await waitFor(() => {
      expect(screen.getByText('Customers')).toBeInTheDocument();
    });
  });

  it('step indicator shows 6 steps', () => {
    setupHandlers();
    renderWithProviders(<CustomReportBuilderPage />);
    expect(screen.getByText('Data Source')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Visualization')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Review & Save')).toBeInTheDocument();
  });

  it('navigation buttons (Back/Next) are present', () => {
    setupHandlers();
    renderWithProviders(<CustomReportBuilderPage />);
    expect(screen.getAllByRole('button', { name: /back/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });
});
