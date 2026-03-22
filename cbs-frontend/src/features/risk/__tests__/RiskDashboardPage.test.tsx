import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { RiskDashboardPage } from '../pages/RiskDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  server.use(
    http.get('/api/v1/risk/appetite', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/heatmap', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/kris', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/alerts', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/limits', () => HttpResponse.json(wrap([]))),
  );
}

describe('RiskDashboardPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<RiskDashboardPage />);
    expect(screen.getByText('Enterprise Risk Dashboard')).toBeInTheDocument();
  });

  it('renders Generate Risk Report button', () => {
    setupHandlers();
    renderWithProviders(<RiskDashboardPage />);
    expect(screen.getByText('Generate Risk Report')).toBeInTheDocument();
  });

  it('handles API errors gracefully', () => {
    server.use(
      http.get('/api/v1/risk/appetite', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/risk/heatmap', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/risk/kris', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/risk/alerts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/risk/limits', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<RiskDashboardPage />);
    expect(screen.getByText('Enterprise Risk Dashboard')).toBeInTheDocument();
  });
});
