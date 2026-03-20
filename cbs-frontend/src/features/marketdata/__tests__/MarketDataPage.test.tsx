import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers';
import { MarketDataManagementPage } from '../pages/MarketDataManagementPage';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// ─── MSW Handlers ────────────────────────────────────────────────────────────

const switchDashboard = {
  totalFeeds: 12,
  activeFeeds: 10,
  messagesPerSec: 450,
  errorRate: 0.02,
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

const handlers = [
  http.get('*/api/v1/market-data-switch/dashboard', () =>
    HttpResponse.json({ data: switchDashboard }),
  ),
  http.get('*/api/v1/market-data/feeds/status', () =>
    HttpResponse.json({ data: feeds }),
  ),
  http.get('*/api/v1/market-data-switch/feed-quality', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.get('*/api/v1/market-data/prices/*', () =>
    HttpResponse.json({ data: null }),
  ),
  http.get('*/api/v1/market-data/signals/*', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.get('*/api/v1/market-data/research/published', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.get('*/api/v1/market-analysis/type/*', () =>
    HttpResponse.json({ data: [] }),
  ),
];

const errorHandlers = [
  http.get('*/api/v1/market-data-switch/dashboard', () =>
    HttpResponse.json({ message: 'Server error' }, { status: 500 }),
  ),
  http.get('*/api/v1/market-data/feeds/status', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.get('*/api/v1/market-data-switch/feed-quality', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.get('*/api/v1/market-data/research/published', () =>
    HttpResponse.json({ data: [] }),
  ),
  http.get('*/api/v1/market-analysis/type/*', () =>
    HttpResponse.json({ data: [] }),
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MarketDataManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    server.use(
      http.get('*/api/v1/market-data/feeds/status', () =>
        HttpResponse.json({ data: [] }),
      ),
    );
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/no data feeds registered/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when dashboard fails', async () => {
    server.use(...errorHandlers);
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(
      () => {
        expect(screen.getByText(/unable to load market data/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
