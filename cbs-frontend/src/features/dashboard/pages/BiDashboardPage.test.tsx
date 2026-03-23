import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { BiDashboardPage } from './BiDashboardPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const dashboards = [
  {
    id: 1,
    dashboardCode: 'EXEC_SUMMARY',
    dashboardName: 'Executive Summary',
    dashboardType: 'EXECUTIVE',
    layoutConfig: { columns: 12 },
    refreshIntervalSec: 300,
    allowedRoles: ['CBS_ADMIN', 'CBS_OFFICER'],
    isDefault: true,
    isActive: true,
    createdBy: 'admin',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-23T08:00:00Z',
  },
  {
    id: 2,
    dashboardCode: 'OPS_MONITOR',
    dashboardName: 'Operations Control',
    dashboardType: 'OPERATIONS',
    layoutConfig: { columns: 12 },
    refreshIntervalSec: 120,
    allowedRoles: ['CBS_OPERATIONS'],
    isDefault: false,
    isActive: true,
    createdBy: 'ops.lead',
    createdAt: '2026-03-21T10:00:00Z',
    updatedAt: '2026-03-22T10:00:00Z',
  },
  {
    id: 3,
    dashboardCode: 'RISK_CANVAS',
    dashboardName: 'Risk Heatmap',
    dashboardType: 'RISK',
    layoutConfig: { columns: 12 },
    refreshIntervalSec: 600,
    allowedRoles: ['CBS_RISK'],
    isDefault: false,
    isActive: false,
    createdBy: 'risk.officer',
    createdAt: '2026-03-19T10:00:00Z',
    updatedAt: '2026-03-21T14:30:00Z',
  },
];

const widgetsByCode: Record<string, unknown> = {
  EXEC_SUMMARY: {
    dashboard: dashboards[0],
    widgets: [
      {
        id: 11,
        dashboardId: 1,
        widgetCode: 'liquidity_tracker',
        widgetType: 'LINE_CHART',
        title: 'Liquidity tracker',
        dataSource: '/api/v1/dashboard/stats',
        queryConfig: {},
        displayConfig: {},
        positionX: 0,
        positionY: 0,
        width: 8,
        height: 3,
        isActive: true,
        createdAt: '2026-03-23T08:00:00Z',
      },
      {
        id: 12,
        dashboardId: 1,
        widgetCode: 'approvals_watch',
        widgetType: 'STAT_CARD',
        title: 'Approvals watch',
        dataSource: '/api/v1/approvals/stats',
        queryConfig: {},
        displayConfig: {},
        positionX: 8,
        positionY: 0,
        width: 4,
        height: 3,
        isActive: true,
        createdAt: '2026-03-23T08:05:00Z',
      },
    ],
  },
  OPS_MONITOR: {
    dashboard: dashboards[1],
    widgets: [],
  },
  RISK_CANVAS: {
    dashboard: dashboards[2],
    widgets: [],
  },
};

function setupHandlers() {
  server.use(
    http.get('*/api/v1/intelligence/dashboards', () => HttpResponse.json(wrap(dashboards))),
    http.get('*/api/v1/intelligence/dashboards/code/:code', ({ params }) => {
      const payload = widgetsByCode[String(params.code)];
      return payload
        ? HttpResponse.json(wrap(payload))
        : HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }),
  );
}

describe('BiDashboardPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders the redesigned API-driven dashboard registry', async () => {
    setupHandlers();

    renderWithProviders(<BiDashboardPage />);

    await waitFor(() => {
    expect(screen.getByRole('button', { name: 'EXEC_SUMMARY' })).toBeInTheDocument();
    });

    expect(screen.getByText('BI Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Role-mapped intelligence canvases')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by code, name, role, or dashboard type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OPS_MONITOR' })).toBeInTheDocument();
  });

  it('filters the registry by live dashboard type and search terms', async () => {
    setupHandlers();

    renderWithProviders(<BiDashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'EXEC_SUMMARY' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /operations/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'OPS_MONITOR' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'EXEC_SUMMARY' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /all dashboards/i }));
    fireEvent.change(screen.getByPlaceholderText('Search by code, name, role, or dashboard type'), {
      target: { value: 'risk' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'RISK_CANVAS' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'OPS_MONITOR' })).not.toBeInTheDocument();
  });

  it('opens dashboard detail and the add-widget configuration flow', async () => {
    setupHandlers();

    renderWithProviders(<BiDashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'EXEC_SUMMARY' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'EXEC_SUMMARY' }));

    await waitFor(() => {
      expect(screen.getByText('Canvas layout & widgets')).toBeInTheDocument();
      expect(screen.getByText('Liquidity tracker')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add widget/i }));

    await waitFor(() => {
      expect(screen.getByText('Configure Widget')).toBeInTheDocument();
    });
  });

  it('shows the retry state when the backend registry request fails', async () => {
    server.use(
      http.get('*/api/v1/intelligence/dashboards', () => HttpResponse.json({ success: false }, { status: 500 })),
    );

    renderWithProviders(<BiDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load BI dashboards')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
