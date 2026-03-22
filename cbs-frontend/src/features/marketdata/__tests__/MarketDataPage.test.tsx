import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers';
import { MarketDataManagementPage } from '../pages/MarketDataManagementPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const switchDashboard = {
  totalFeeds: 12,
  activeFeeds: 10,
  messagesPerSec: 450,
  errorRate: 0.02,
  uptimePct: 99.9,
};

const feeds = [
  {
    feedId: 'f-1',
    provider: 'Bloomberg',
    assetClass: 'EQUITIES',
    feedType: 'REALTIME',
    instruments: ['DANGCEM'],
    lastReceivedAt: '2025-01-01T10:00:00Z',
    latencyMs: 12,
    status: 'ACTIVE',
  },
];

function setupHandlers(overrides?: { dashboard?: unknown; feeds?: unknown }) {
  server.use(
    http.get('/api/v1/market-data-switch/dashboard', () =>
      HttpResponse.json(wrap(overrides?.dashboard ?? switchDashboard)),
    ),
    http.get('/api/v1/market-data/feeds/status', () =>
      HttpResponse.json(wrap(overrides?.feeds ?? feeds)),
    ),
    http.get('/api/v1/market-data-switch/feed-quality', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/market-data/prices/*', () =>
      HttpResponse.json(wrap(null)),
    ),
    http.get('/api/v1/market-data/signals/*', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/market-data/research/published', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/market-analysis/type/:type', () =>
      HttpResponse.json(wrap([])),
    ),
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MarketDataManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHandlers();
  });

  it('renders the page header', async () => {
    renderWithProviders(<MarketDataManagementPage />);
    expect(screen.getByText('Market Data Infrastructure')).toBeInTheDocument();
  });

  it('renders stat cards with dashboard data', async () => {
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Feeds')).toBeInTheDocument();
      expect(screen.getByText('Active Feeds')).toBeInTheDocument();
      expect(screen.getByText('Messages / sec')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
    });
  });

  it('renders tabs and defaults to Data Feeds tab', async () => {
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /data feeds/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /prices & signals/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /research/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analysis/i })).toBeInTheDocument();
    });
  });

  it('switches to Prices & Signals tab on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MarketDataManagementPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /prices & signals/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /prices & signals/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/instrument code/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no feeds are registered', async () => {
    setupHandlers({ feeds: [] });
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/no data feeds registered/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when dashboard fails', async () => {
    server.use(
      http.get('/api/v1/market-data-switch/dashboard', () => HttpResponse.error()),
      http.get('/api/v1/market-data/feeds/status', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/market-data-switch/feed-quality', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/market-data/research/published', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/market-analysis/type/:type', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/unable to load market data/i)).toBeInTheDocument();
    });
  });
});
