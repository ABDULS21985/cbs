import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { ValuationPage } from '../pages/ValuationPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MODELS = {
  data: [
    {
      id: 1, modelCode: 'VM-DCF001', modelName: 'Fixed Income DCF',
      instrumentType: 'BOND', valuationMethodology: 'DISCOUNTED_CASH_FLOW',
      fairValueHierarchy: 'LEVEL_2', calibrationFrequency: 'DAILY',
      ipvThresholdPct: 5, modelOwner: 'Risk Team', status: 'PRODUCTION',
    },
  ],
};

const MOCK_RUNS = {
  data: [
    {
      id: 1, runRef: 'VR-RUN001', valuationDate: '2026-03-20', modelId: 1,
      runType: 'END_OF_DAY', instrumentsValued: 50, totalMarketValue: 125000000,
      currency: 'USD', unrealizedGainLoss: 2500000,
      fairValueLevel1Total: 50000000, fairValueLevel2Total: 60000000,
      fairValueLevel3Total: 15000000, ipvBreachCount: 3, status: 'COMPLETED',
      runStartedAt: '2026-03-20T17:00:00Z', runCompletedAt: '2026-03-20T17:15:00Z',
    },
  ],
};

const MOCK_EXCEPTIONS = {
  data: [
    {
      id: 1, instrumentCode: 'BOND-XYZ', isin: 'US1234567890',
      modelPrice: 98.5, marketPrice: 105.2, priceDeviation: 6.8,
      deviationBreached: true, fairValueLevel: 'LEVEL_2', status: 'BREACHED',
    },
  ],
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/valuations/models', () => HttpResponse.json(MOCK_MODELS)),
    http.get('/api/v1/valuations/runs', () => HttpResponse.json(MOCK_RUNS)),
    http.get('/api/v1/valuations/runs/VR-RUN001/exceptions', () =>
      HttpResponse.json(MOCK_EXCEPTIONS),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ValuationPage', () => {
  it('renders page header "Securities Valuation"', () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    expect(screen.getByText('Securities Valuation')).toBeInTheDocument();
  });

  it('renders page subtitle', () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    expect(screen.getByText(/model registry, valuation runs/i)).toBeInTheDocument();
  });

  it('shows tabs: Models Registry, Valuation Runs, IPV Dashboard', () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    expect(screen.getByText('Models Registry')).toBeInTheDocument();
    expect(screen.getByText('Valuation Runs')).toBeInTheDocument();
    expect(screen.getByText('IPV Dashboard')).toBeInTheDocument();
  });

  it('shows Define Model button in page header', () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    const defineButtons = screen.getAllByRole('button', { name: /define model/i });
    expect(defineButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('Models Registry tab displays model data in table', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    await waitFor(() => {
      expect(screen.getByText('VM-DCF001')).toBeInTheDocument();
      expect(screen.getByText('Fixed Income DCF')).toBeInTheDocument();
      expect(screen.getByText('BOND')).toBeInTheDocument();
      expect(screen.getByText('DISCOUNTED CASH FLOW')).toBeInTheDocument();
    });
  });

  it('Models Registry tab shows model owner', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    await waitFor(() => {
      expect(screen.getByText('Risk Team')).toBeInTheDocument();
    });
  });

  it('Valuation Runs tab shows New Valuation Run button', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    fireEvent.click(screen.getByText('Valuation Runs'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new valuation run/i })).toBeInTheDocument();
    });
  });

  it('Valuation Runs tab displays run data in table', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    fireEvent.click(screen.getByText('Valuation Runs'));
    await waitFor(() => {
      expect(screen.getByText('VR-RUN001')).toBeInTheDocument();
    });
  });

  it('Valuation Runs tab shows Fair Value Breakdown for latest run', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    fireEvent.click(screen.getByText('Valuation Runs'));
    await waitFor(() => {
      expect(screen.getByText(/Fair Value Breakdown/i)).toBeInTheDocument();
    });
  });

  it('IPV Dashboard tab shows stat cards', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    fireEvent.click(screen.getByText('IPV Dashboard'));
    await waitFor(() => {
      expect(screen.getByText('Breaches This Month')).toBeInTheDocument();
      expect(screen.getByText('Models with Breaches')).toBeInTheDocument();
      expect(screen.getByText('Instruments to Review')).toBeInTheDocument();
      expect(screen.getByText('Total Runs')).toBeInTheDocument();
    });
  });

  it('IPV Dashboard tab shows Current Breaches section', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    fireEvent.click(screen.getByText('IPV Dashboard'));
    await waitFor(() => {
      expect(screen.getByText(/Current Breaches/i)).toBeInTheDocument();
    });
  });

  it('New Valuation Run dialog opens on button click', async () => {
    setupHandlers();
    renderWithProviders(<ValuationPage />);
    fireEvent.click(screen.getByText('Valuation Runs'));
    // Wait for models to load so the button becomes enabled
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /new valuation run/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /new valuation run/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New Valuation Run' })).toBeInTheDocument();
    });
  });
});
