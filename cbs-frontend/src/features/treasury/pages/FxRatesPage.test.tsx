import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { FxRatesPage } from './FxRatesPage';

const MOCK_RATES = [
  {
    pair: 'USD/NGN',
    bid: 1540.5,
    ask: 1542.0,
    mid: 1541.25,
    change: 2.5,
    changeDirection: 'up' as const,
    lastUpdated: '2025-01-15T10:00:00Z',
  },
  {
    pair: 'GBP/NGN',
    bid: 1950.0,
    ask: 1952.5,
    mid: 1951.25,
    change: -1.25,
    changeDirection: 'down' as const,
    lastUpdated: '2025-01-15T10:00:00Z',
  },
  {
    pair: 'EUR/NGN',
    bid: 1670.0,
    ask: 1672.0,
    mid: 1671.0,
    change: 0,
    changeDirection: 'flat' as const,
    lastUpdated: '2025-01-15T10:00:00Z',
  },
  {
    pair: 'EUR/USD',
    bid: 1.085,
    ask: 1.087,
    mid: 1.086,
    change: 0.001,
    changeDirection: 'up' as const,
    lastUpdated: '2025-01-15T10:00:00Z',
  },
];

function setupHandlers(overrides?: { rates?: unknown }) {
  server.use(
    http.get('/api/v1/market-data/fx-rates', () =>
      HttpResponse.json(overrides?.rates ?? MOCK_RATES),
    ),
  );
}

describe('FxRatesPage', () => {
  it('renders page header "FX Rates"', () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    expect(screen.getByText('FX Rates')).toBeInTheDocument();
  });

  it('renders the page subtitle', () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    expect(screen.getByText(/Live foreign exchange rates/i)).toBeInTheDocument();
  });

  it('renders stat card labels', () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    expect(screen.getByText('Currency Pairs')).toBeInTheDocument();
    expect(screen.getByText('Avg Spread (bps)')).toBeInTheDocument();
    expect(screen.getByText('Pairs Moving Up')).toBeInTheDocument();
    expect(screen.getByText('Pairs Moving Down')).toBeInTheDocument();
  });

  it('renders the Refresh button', () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders rate cards for each currency pair', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getAllByText('USD/NGN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('GBP/NGN').length).toBeGreaterThan(0);
    });
  });

  it('renders Bid, Mid, Ask labels in rate cards', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Bid').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mid').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Ask').length).toBeGreaterThan(0);
    });
  });

  it('renders "Major Pairs" section heading for major currency pairs', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getByText('Major Pairs')).toBeInTheDocument();
    });
  });

  it('renders "All Pairs" section heading', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getByText('All Pairs')).toBeInTheDocument();
    });
  });

  it('renders spread information in rate cards', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Spread:/i).length).toBeGreaterThan(0);
    });
  });

  it('shows EUR/USD as a major pair', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getAllByText('EUR/USD').length).toBeGreaterThan(0);
    });
  });

  it('shows EUR/NGN in the all pairs grid', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getAllByText('EUR/NGN').length).toBeGreaterThan(0);
    });
  });

  it('shows empty state message when no rates available', async () => {
    setupHandlers({ rates: [] });
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getByText('No FX rates available')).toBeInTheDocument();
    });
  });

  it('shows market data offline hint when no rates', async () => {
    setupHandlers({ rates: [] });
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Market data feeds may be offline/i)).toBeInTheDocument();
    });
  });

  it('does not show rate cards when data is empty', async () => {
    setupHandlers({ rates: [] });
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      expect(screen.queryByText('USD/NGN')).not.toBeInTheDocument();
      expect(screen.queryByText('GBP/NGN')).not.toBeInTheDocument();
    });
  });

  it('shows correct total currency pair count in stat card', async () => {
    setupHandlers();
    renderWithProviders(<FxRatesPage />);
    await waitFor(() => {
      // 4 mock rates — the StatCard should display the count
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
