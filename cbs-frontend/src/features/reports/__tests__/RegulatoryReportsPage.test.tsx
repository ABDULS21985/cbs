import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { RegulatoryReportsPage } from '../pages/RegulatoryReportsPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DEFINITIONS = [
  {
    id: 1,
    reportCode: 'CBN-001',
    reportName: 'Prudential Return',
    regulator: 'CBN',
    frequency: 'MONTHLY',
    category: 'PRUDENTIAL',
    format: 'XLSX',
    active: true,
  },
];

const MOCK_RUNS = [
  {
    id: 1,
    reportCode: 'CBN-001',
    reportName: 'Prudential Return',
    regulator: 'CBN',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    status: 'GENERATED',
    generatedAt: '2026-02-01T10:00:00Z',
    rowCount: 120,
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/regulatory/definitions', () =>
      HttpResponse.json(wrap(MOCK_DEFINITIONS)),
    ),
    http.get('/api/v1/regulatory/definitions/regulator/:regulator', () =>
      HttpResponse.json(wrap(MOCK_DEFINITIONS)),
    ),
    http.get('/api/v1/regulatory/runs/:code', () =>
      HttpResponse.json(wrap(MOCK_RUNS)),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RegulatoryReportsPage', () => {
  it('renders page header "Regulatory Reports"', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReportsPage />);
    expect(screen.getByText('Regulatory Reports')).toBeInTheDocument();
  });

  it('displays definitions in table after load', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReportsPage />);
    await waitFor(() => {
      expect(screen.getByText('CBN-001')).toBeInTheDocument();
      expect(screen.getByText('Prudential Return')).toBeInTheDocument();
    });
  });

  it('shows Add Definition button', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReportsPage />);
    expect(
      screen.getByRole('button', { name: /add definition/i }),
    ).toBeInTheDocument();
  });

  it('regulator filter tabs are present (ALL, CBN, SEC, NDIC)', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReportsPage />);
    expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CBN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SEC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NDIC' })).toBeInTheDocument();
  });

  it('Generate button is visible on definition rows', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReportsPage />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /generate/i }),
      ).toBeInTheDocument();
    });
  });

  it('Runs tab is present', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReportsPage />);
    expect(screen.getByText('Run History')).toBeInTheDocument();
  });
});
