import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { FraudManagementPage } from '../pages/FraudManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  total: 25,
  new: 8,
  investigating: 5,
  resolved: 12,
};

const mockModelPerformance = {
  totalAlerts: 100,
  resolvedAlerts: 85,
  falsePositives: 10,
  detectionRate: 0.85,
  falsePositiveRate: 0.118,
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/fraud/stats', () => HttpResponse.json(wrap(mockStats))),
    http.get('/api/v1/fraud/trend', () => HttpResponse.json(wrap({ recentAlerts: [] }))),
    http.get('/api/v1/fraud/alerts', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/fraud/rules', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/fraud/model-performance', () => HttpResponse.json(wrap(mockModelPerformance))),
  );
}

describe('FraudManagementPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<FraudManagementPage />);
    expect(screen.getByText('Fraud Management')).toBeInTheDocument();
  });

  it('renders stats cards', async () => {
    setupHandlers();
    renderWithProviders(<FraudManagementPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    });
    expect(screen.getByText('New Alerts')).toBeInTheDocument();
    expect(screen.getByText('Investigating')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('Resolution Rate')).toBeInTheDocument();
  });

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<FraudManagementPage />);
    expect(screen.getByText('Alert Triage')).toBeInTheDocument();
    expect(screen.getByText('Active Cases')).toBeInTheDocument();
    expect(screen.getByText('Rules & Models')).toBeInTheDocument();
    expect(screen.getByText('Patterns')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('can switch between tabs', () => {
    setupHandlers();
    renderWithProviders(<FraudManagementPage />);

    fireEvent.click(screen.getByText('Active Cases'));
    const activeCasesTab = screen.getByText('Active Cases');
    expect(activeCasesTab.closest('button')?.className ?? activeCasesTab.className).toContain('border-primary');

    fireEvent.click(screen.getByText('Rules & Models'));
    const rulesTab = screen.getByText('Rules & Models');
    expect(rulesTab.closest('button')?.className ?? rulesTab.className).toContain('border-primary');

    fireEvent.click(screen.getByText('Patterns'));
    const patternsTab = screen.getByText('Patterns');
    expect(patternsTab.closest('button')?.className ?? patternsTab.className).toContain('border-primary');

    fireEvent.click(screen.getByText('Reports'));
    const reportsTab = screen.getByText('Reports');
    expect(reportsTab.closest('button')?.className ?? reportsTab.className).toContain('border-primary');
  });

  it('shows empty state in Active Cases when no alert selected', async () => {
    setupHandlers();
    renderWithProviders(<FraudManagementPage />);
    fireEvent.click(screen.getByText('Active Cases'));
    await waitFor(() => {
      expect(screen.getByText('Select an alert to open investigation')).toBeInTheDocument();
    });
  });

  it('shows Create Rule button in Rules & Models tab', async () => {
    setupHandlers();
    renderWithProviders(<FraudManagementPage />);
    fireEvent.click(screen.getByText('Rules & Models'));
    await waitFor(() => {
      expect(screen.getByText('Create Rule')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', () => {
    server.use(
      http.get('/api/v1/fraud/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/trend', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/alerts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/rules', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/fraud/model-performance', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<FraudManagementPage />);
    expect(screen.getByText('Fraud Management')).toBeInTheDocument();
  });
});
