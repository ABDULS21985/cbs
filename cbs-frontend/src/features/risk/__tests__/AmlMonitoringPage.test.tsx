import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { AmlMonitoringPage } from '../pages/AmlMonitoringPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  openAlerts: 12,
  highPriority: 3,
  underInvestigation: 5,
  strFiledMtd: 2,
  avgResolutionDays: 4.5,
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/aml/stats', () => HttpResponse.json(wrap(mockStats))),
    http.get('/api/v1/aml/alerts', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/aml/strs', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/aml/ctrs', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/aml/rules', () => HttpResponse.json(wrap([]))),
  );
}

describe('AmlMonitoringPage', () => {
  it('renders page header with correct title', () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    expect(screen.getByText('AML/CFT Monitoring')).toBeInTheDocument();
  });

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    expect(screen.getByText('Alert Queue')).toBeInTheDocument();
    expect(screen.getByText('Investigations')).toBeInTheDocument();
    expect(screen.getByText('STR Filing')).toBeInTheDocument();
    expect(screen.getByText('CTR Reports')).toBeInTheDocument();
    expect(screen.getByText('Rules')).toBeInTheDocument();
  });

  it('shows Alert Queue tab by default', () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    const tab = screen.getByText('Alert Queue');
    expect(tab.closest('button')?.className ?? tab.className).toContain('border-primary');
  });

  it('can switch to STR Filing tab', () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    fireEvent.click(screen.getByText('STR Filing'));
    const tab = screen.getByText('STR Filing');
    expect(tab.closest('button')?.className ?? tab.className).toContain('border-primary');
  });

  it('shows New STR button in STR Filing tab', async () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    fireEvent.click(screen.getByText('STR Filing'));
    await waitFor(() => {
      expect(screen.getByText('New STR')).toBeInTheDocument();
    });
  });

  it('can switch to Rules tab', () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    fireEvent.click(screen.getByText('Rules'));
    const tab = screen.getByText('Rules');
    expect(tab.closest('button')?.className ?? tab.className).toContain('border-primary');
  });

  it('shows New Rule button in Rules tab', async () => {
    setupHandlers();
    renderWithProviders(<AmlMonitoringPage />);
    fireEvent.click(screen.getByText('Rules'));
    await waitFor(() => {
      expect(screen.getByText('+ New Rule')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', () => {
    server.use(
      http.get('/api/v1/aml/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/alerts', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/strs', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/ctrs', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/aml/rules', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<AmlMonitoringPage />);
    expect(screen.getByText('AML/CFT Monitoring')).toBeInTheDocument();
  });
});
