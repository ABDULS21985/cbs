import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { ApiMonitoringPage } from './ApiMonitoringPage';

vi.mock('@/components/shared/TabsPage', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    TabsPage: ({ tabs, defaultTab }: { tabs: Array<{ id: string; label: string; content: React.ReactNode; badge?: number }>; defaultTab?: string }) => {
      const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs[0]?.id);
      const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

      return (
        <div>
          <div>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
                {tab.badge ? ` ${tab.badge}` : ''}
              </button>
            ))}
          </div>
          <div>{currentTab?.content}</div>
        </div>
      );
    },
  };
});

vi.mock('../components/monitoring/RequestVolumeChart', () => ({
  RequestVolumeChart: () => <div>Request Volume Chart</div>,
}));

vi.mock('../components/monitoring/EndpointLatencyChart', () => ({
  EndpointLatencyChart: () => <div>Endpoint Latency Chart</div>,
}));

vi.mock('../components/monitoring/ErrorRateChart', () => ({
  ErrorRateChart: () => <div>Error Rate Chart</div>,
}));

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockProducts = [
  {
    id: 1,
    productCode: 'ACCOUNTS',
    productName: 'Accounts API',
    productCategory: 'AISP',
    apiVersion: 'v1',
    description: 'Account information services',
    documentationUrl: null,
    basePath: '/api/v1/openbanking/accounts',
    supportedMethods: ['GET'],
    rateLimitTier: 'STANDARD',
    rateLimitPerMin: 60,
    pricingModel: 'FREE',
    pricePerCall: null,
    monthlyPrice: null,
    sandboxAvailable: true,
    requiresApproval: false,
    status: 'PUBLISHED',
    publishedAt: '2026-01-01T00:00:00Z',
    deprecatedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: 2,
    productCode: 'PAYMENTS',
    productName: 'Payments API',
    productCategory: 'PISP',
    apiVersion: 'v1',
    description: 'Payment initiation services',
    documentationUrl: null,
    basePath: '/api/v1/openbanking/payments',
    supportedMethods: ['POST'],
    rateLimitTier: 'PREMIUM',
    rateLimitPerMin: 120,
    pricingModel: 'PAID',
    pricePerCall: 2.5,
    monthlyPrice: 10000,
    sandboxAvailable: true,
    requiresApproval: true,
    status: 'PUBLISHED',
    publishedAt: '2026-01-15T00:00:00Z',
    deprecatedAt: null,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  },
];

const mockUsage = [
  {
    productId: 1,
    date: '2026-03-20',
    totalCalls: 120000,
    successCalls: 118500,
    errorCalls: 1500,
    avgLatencyMs: 620,
    p95LatencyMs: 980,
  },
  {
    productId: 1,
    date: '2026-03-21',
    totalCalls: 140000,
    successCalls: 125000,
    errorCalls: 15000,
    avgLatencyMs: 760,
    p95LatencyMs: 1280,
  },
  {
    productId: 2,
    date: '2026-03-21',
    totalCalls: 60000,
    successCalls: 59800,
    errorCalls: 200,
    avgLatencyMs: 160,
    p95LatencyMs: 320,
  },
];

function setupHandlers({
  products = mockProducts,
  usage = mockUsage,
}: {
  products?: typeof mockProducts;
  usage?: typeof mockUsage;
} = {}) {
  server.use(
    http.get('/api/v1/marketplace/products', () => HttpResponse.json(wrap(products))),
    http.get('/api/v1/marketplace/usage/aggregated', () => HttpResponse.json(wrap(usage))),
  );
}

describe('ApiMonitoringPage', () => {
  it('renders the upgraded observatory hero', async () => {
    setupHandlers();
    renderWithProviders(<ApiMonitoringPage />);

    expect(screen.getByText('API Monitoring')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Open Banking performance observatory')).toBeInTheDocument();
    });

    expect(screen.getByText('Peak Daily Volume')).toBeInTheDocument();
    expect(screen.getByText('200,000')).toBeInTheDocument();
  });

  it('derives monitoring alerts from marketplace usage', async () => {
    setupHandlers();
    renderWithProviders(<ApiMonitoringPage />);

    fireEvent.click(screen.getByRole('button', { name: /Alerts/i }));

    await waitFor(() => {
      expect(screen.getByText('HIGH LATENCY')).toBeInTheDocument();
    });

    expect(screen.getByText('HIGH ERROR RATE')).toBeInTheDocument();
    expect(screen.getAllByText('Acknowledge').length).toBeGreaterThan(0);
  });

  it('renders historical daily aggregates from the API feed', async () => {
    setupHandlers();
    renderWithProviders(<ApiMonitoringPage />);

    fireEvent.click(screen.getByRole('button', { name: /Historical/i }));

    await waitFor(() => {
      expect(screen.getByText('Daily Aggregates')).toBeInTheDocument();
    });

    expect(screen.getAllByText('200,000').length).toBeGreaterThan(0);
    expect(screen.getByText('7.60%')).toBeInTheDocument();
  });

  it('shows empty states when monitoring feeds are empty', async () => {
    setupHandlers({ products: [], usage: [] });
    renderWithProviders(<ApiMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText('No monitoring feed yet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Alerts/i }));

    await waitFor(() => {
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /SLA Report/i }));

    await waitFor(() => {
      expect(screen.getByText('No API products to report on')).toBeInTheDocument();
    });
  });
});
