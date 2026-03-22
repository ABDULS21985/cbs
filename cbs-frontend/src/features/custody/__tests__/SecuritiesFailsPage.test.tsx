import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { SecuritiesFailsPage } from '../pages/SecuritiesFailsPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DASHBOARD = {
  data: {
    totalFails: 15,
    openFails: 8,
    byType: {
      DELIVERY_FAIL: 5,
      RECEIPT_FAIL: 3,
      CASH_SHORTFALL: 4,
      COUNTERPARTY_FAIL: 3,
    },
    byAgingBucket: {
      SAME_DAY: 2,
      '1_TO_3_DAYS': 3,
      '4_TO_7_DAYS': 2,
      '8_TO_14_DAYS': 1,
    },
    totalPenalty: 12500.5,
  },
};

const MOCK_CP_REPORT = { data: { 'CP-001': 3, 'CP-002': 5 } };

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/securities-fails/dashboard', () =>
      HttpResponse.json(MOCK_DASHBOARD),
    ),
    http.get('/api/v1/securities-fails/counterparty-report', () =>
      HttpResponse.json(MOCK_CP_REPORT),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SecuritiesFailsPage', () => {
  it('renders page header "Securities Fails Management"', () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    expect(screen.getByText('Securities Fails Management')).toBeInTheDocument();
  });

  it('shows stat cards: Total Fails, Open Fails, Penalty Accrued, Counterparties', async () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Fails')).toBeInTheDocument();
      expect(screen.getByText('Open Fails')).toBeInTheDocument();
      expect(screen.getByText('Penalty Accrued')).toBeInTheDocument();
      expect(screen.getByText('Counterparties')).toBeInTheDocument();
    });
  });

  it('shows fail type distribution section', async () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      expect(screen.getByText('Fail Type Distribution')).toBeInTheDocument();
    });
  });

  it('shows individual fail types from byType data', async () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      expect(screen.getByText('DELIVERY FAIL')).toBeInTheDocument();
      expect(screen.getByText('RECEIPT FAIL')).toBeInTheDocument();
      expect(screen.getByText('CASH SHORTFALL')).toBeInTheDocument();
      expect(screen.getByText('COUNTERPARTY FAIL')).toBeInTheDocument();
    });
  });

  it('shows aging distribution chart section', async () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      expect(screen.getByText('Aging Distribution')).toBeInTheDocument();
    });
  });

  it('shows counterparty fail report', async () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      expect(screen.getByText('Counterparty Fail Report')).toBeInTheDocument();
      expect(screen.getByText('CP-001')).toBeInTheDocument();
      expect(screen.getByText('CP-002')).toBeInTheDocument();
    });
  });

  it('displays open fails count for each counterparty', async () => {
    setupHandlers();
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      const openFailsLabels = screen.getAllByText('open fails');
      expect(openFailsLabels.length).toBe(2);
    });
  });

  it('shows empty state when dashboard has zero fails', async () => {
    server.use(
      http.get('/api/v1/securities-fails/dashboard', () =>
        HttpResponse.json({ data: { totalFails: 0, openFails: 0, byType: {}, byAgingBucket: {}, totalPenalty: 0 } }),
      ),
      http.get('/api/v1/securities-fails/counterparty-report', () =>
        HttpResponse.json({ data: {} }),
      ),
    );
    renderWithProviders(<SecuritiesFailsPage />);
    await waitFor(() => {
      expect(screen.getByText('No securities fails')).toBeInTheDocument();
    });
  });
});
