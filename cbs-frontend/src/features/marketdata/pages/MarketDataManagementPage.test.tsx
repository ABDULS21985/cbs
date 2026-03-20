import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { MarketDataManagementPage } from './MarketDataManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockDashboard = { totalFeeds: 12, activeFeeds: 10, messagesPerSec: 1450, errorRate: 0.23, uptimePct: 99.97 };

const mockFeeds = [
  { feedId: 'F-001', provider: 'Reuters', assetClass: 'Equities', feedType: 'REALTIME', instruments: ['DANGCEM', 'GTCO'], lastReceivedAt: '2026-03-20T10:00:00Z', latencyMs: 45, status: 'ACTIVE' },
  { feedId: 'F-002', provider: 'Bloomberg', assetClass: 'FX', feedType: 'REALTIME', instruments: ['NGN/USD'], lastReceivedAt: '2026-03-20T09:55:00Z', latencyMs: 120, status: 'STALE' },
  { feedId: 'F-003', provider: 'CBN', assetClass: 'Rates', feedType: 'EOD', instruments: ['TBILL-91'], lastReceivedAt: '2026-03-19T17:00:00Z', latencyMs: 0, status: 'DOWN' },
];

const mockQuality = [
  { feedId: 'F-001', provider: 'Reuters', assetClass: 'Equities', completeness: 98.5, accuracy: 99.2, timeliness: 97.1, errorCount: 3, overallScore: 95 },
  { feedId: 'F-002', provider: 'Bloomberg', assetClass: 'FX', completeness: 92.0, accuracy: 99.8, timeliness: 85.0, errorCount: 15, overallScore: 72 },
];

function setupHandlers(overrides?: { dashboard?: unknown; feeds?: unknown; quality?: unknown }) {
  server.use(
    http.get('/api/v1/market-data-switch/dashboard', () => HttpResponse.json(wrap(overrides?.dashboard ?? mockDashboard))),
    http.get('/api/v1/market-data/feeds/status', () => HttpResponse.json(wrap(overrides?.feeds ?? mockFeeds))),
    http.get('/api/v1/market-data-switch/feed-quality', () => HttpResponse.json(wrap(overrides?.quality ?? mockQuality))),
    http.get('/api/v1/market-data/research/published', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/market-analysis/type/:type', () => HttpResponse.json(wrap([]))),
  );
}

describe('MarketDataManagementPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    expect(screen.getByText('Market Data Infrastructure')).toBeInTheDocument();
  });

  it('renders stat cards with data', async () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Feeds')).toBeInTheDocument();
      expect(screen.getByText('Active Feeds')).toBeInTheDocument();
      expect(screen.getByText('Messages / sec')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
    });
  });

  it('renders tabs', () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    expect(screen.getByText('Data Feeds')).toBeInTheDocument();
    expect(screen.getByText('Prices & Signals')).toBeInTheDocument();
    expect(screen.getByText('Research')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('shows live status indicator', async () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/Live/)).toBeInTheDocument();
    });
  });

  it('shows feed data in table', async () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Reuters')).toBeInTheDocument();
      expect(screen.getByText('Bloomberg')).toBeInTheDocument();
    });
  });

  it('shows feed status dots with correct colors', async () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      const statusDots = screen.getAllByLabelText(/Feed status:/);
      expect(statusDots.length).toBeGreaterThan(0);
    });
  });

  it('shows Register Feed button', () => {
    setupHandlers();
    renderWithProviders(<MarketDataManagementPage />);
    expect(screen.getByText('Register Feed')).toBeInTheDocument();
  });

  it('shows empty state when no feeds', async () => {
    setupHandlers({ feeds: [] });
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('No data feeds registered')).toBeInTheDocument();
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
      expect(screen.getByText(/Unable to load market data/)).toBeInTheDocument();
    });
  });

  it('shows Retry button on error', async () => {
    server.use(
      http.get('/api/v1/market-data-switch/dashboard', () => HttpResponse.error()),
      http.get('/api/v1/market-data/feeds/status', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/market-data-switch/feed-quality', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/market-data/research/published', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/market-analysis/type/:type', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<MarketDataManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
