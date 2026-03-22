import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { ChannelAnalyticsPage } from '../pages/ChannelAnalyticsPage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  totalTransactions: 245000,
  digitalTransactions: 198000,
  digitalPct: 80.8,
  branchTransactions: 47000,
  branchPct: 19.2,
  successRate: 99.4,
  avgResponseMs: 1250,
  revenueFees: 18500000,
};

const MOCK_VOLUMES = [
  { channel: 'MOBILE', label: 'Mobile', count: 120000, pct: 48.9, color: '#3b82f6' },
  { channel: 'WEB', label: 'Web', count: 78000, pct: 31.8, color: '#10b981' },
  { channel: 'BRANCH', label: 'Branch', count: 47000, pct: 19.2, color: '#6b7280' },
];

const MOCK_MIX_TREND = [
  { month: '2026-01', mobile: 45, web: 30, branch: 20, atm: 3, ussd: 1, pos: 1 },
];

const MOCK_HEATMAP = [
  { hour: 9, dayOfWeek: 1, count: 1500, intensity: 0.8 },
];

const MOCK_SUCCESS_RATES = [
  { channel: 'MOBILE', label: 'Mobile', total: 120000, success: 119400, failed: 400, timeout: 200, successPct: 99.5, avgLatencyMs: 800, p95LatencyMs: 2100 },
  { channel: 'WEB', label: 'Web', total: 78000, success: 77200, failed: 600, timeout: 200, successPct: 98.9, avgLatencyMs: 1200, p95LatencyMs: 3200 },
];

const MOCK_SUCCESS_TREND = [
  { date: '2026-01-01', mobile: 99.5, web: 99.1, branch: 99.8 },
];

const MOCK_ADOPTION = {
  registeredUsers: 850000,
  registeredGrowthPct: 12.5,
  activeUsers30d: 340000,
  activePctOfTotal: 40,
  featureAdoption: [{ feature: 'Bill Pay', pct: 72 }],
  funnel: { registered: 850000, firstLogin: 720000, firstTransaction: 510000, regularUser: 340000 },
};

const MOCK_TXN_TYPES = [
  { type: 'TRANSFER', label: 'Transfer', count: 95000, value: 5200000000, avgAmount: 54736, channelMix: 'Mobile 60%, Web 30%', growthPct: 15 },
];

const MOCK_MIGRATION = {
  migrations: [
    { fromChannel: 'BRANCH', toChannel: 'MOBILE', customerCount: 12000, migrationPct: 8.5 },
  ],
  migrationScore: 'Good',
};

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/reports/channels/stats', () => HttpResponse.json(wrap(MOCK_STATS))),
    http.get('/api/v1/reports/channels/volumes', () => HttpResponse.json(wrap(MOCK_VOLUMES))),
    http.get('/api/v1/reports/channels/mix-trend', () => HttpResponse.json(wrap(MOCK_MIX_TREND))),
    http.get('/api/v1/reports/channels/heatmap', () => HttpResponse.json(wrap(MOCK_HEATMAP))),
    http.get('/api/v1/reports/channels/success-rates', () => HttpResponse.json(wrap(MOCK_SUCCESS_RATES))),
    http.get('/api/v1/reports/channels/success-trend', () => HttpResponse.json(wrap(MOCK_SUCCESS_TREND))),
    http.get('/api/v1/reports/channels/digital-adoption', () => HttpResponse.json(wrap(MOCK_ADOPTION))),
    http.get('/api/v1/reports/channels/transaction-types', () => HttpResponse.json(wrap(MOCK_TXN_TYPES))),
    http.get('/api/v1/reports/channels/migration', () => HttpResponse.json(wrap(MOCK_MIGRATION))),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ChannelAnalyticsPage', () => {
  it('renders page title', () => {
    setupHandlers();
    renderWithProviders(<ChannelAnalyticsPage />);
    expect(screen.getByText('Channel & Transaction Analytics')).toBeInTheDocument();
  });

  it('displays channel stats cards after load', async () => {
    setupHandlers();
    renderWithProviders(<ChannelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Transactions')).toBeInTheDocument();
      expect(screen.getByText('Digital Transactions')).toBeInTheDocument();
      expect(screen.getByText('Branch Transactions')).toBeInTheDocument();
      expect(screen.getAllByText('Success Rate').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
      expect(screen.getByText('Revenue from Fees')).toBeInTheDocument();
    });
  });

  it('channel volume visualization renders', async () => {
    setupHandlers();
    renderWithProviders(<ChannelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Channel Volume Distribution')).toBeInTheDocument();
    });
  });

  it('success rate table renders', async () => {
    setupHandlers();
    renderWithProviders(<ChannelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Channel Success Rates & Latency')).toBeInTheDocument();
    });
  });

  it('digital adoption section renders', async () => {
    setupHandlers();
    renderWithProviders(<ChannelAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Digital Adoption Metrics')).toBeInTheDocument();
    });
  });
});
