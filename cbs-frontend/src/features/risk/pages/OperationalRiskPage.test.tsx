import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { OperationalRiskPage } from './OperationalRiskPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  lossEventsMtd: 8,
  totalLossMtd: 12000000,
  openIncidents: 5,
  krisBreached: 2,
  rcsaDue: 3,
  currency: 'NGN',
};

const mockLossEvents = [
  { id: 1, eventDate: '2026-03-15', category: 'Internal Fraud', description: 'Unauthorized transfer', amount: 5000000, status: 'OPEN', branch: 'Lagos Main' },
  { id: 2, eventDate: '2026-03-10', category: 'External Fraud', description: 'ATM skimming', amount: 2000000, status: 'INVESTIGATING', branch: 'Ikeja' },
];

const mockKris = [
  { id: 1, name: 'System Downtime', value: 4.5, threshold: 3, breached: true, unit: 'hours', period: 'MTD' },
  { id: 2, name: 'Transaction Failure Rate', value: 1.2, threshold: 2, breached: false, unit: '%', period: 'MTD' },
];

function setupHandlers(stats = mockStats) {
  server.use(
    http.get('/api/v1/risk/operational/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/risk/operational/loss-events', () => HttpResponse.json(wrap(mockLossEvents))),
    http.get('/api/v1/risk/operational/loss-by-category', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/operational/loss-trend', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/operational/kris', () => HttpResponse.json(wrap(mockKris))),
    http.get('/api/v1/risk/operational/rcsa', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/operational/incidents', () => HttpResponse.json(wrap([]))),
  );
}

describe('OperationalRiskPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    expect(screen.getByText('Operational Risk')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    expect(screen.getByText(/loss events.*KRIs.*RCSA.*incident/i)).toBeInTheDocument();
  });

  it('renders 5 stat cards', async () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    await waitFor(() => {
      expect(screen.getByText('Loss Events MTD')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Loss')).toBeInTheDocument();
    expect(screen.getByText('Open Incidents')).toBeInTheDocument();
    expect(screen.getByText('KRIs Breached')).toBeInTheDocument();
    expect(screen.getByText('RCSA Due')).toBeInTheDocument();
  });

  it('displays stat values', async () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument();
    });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders 4 tabs', () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    expect(screen.getByText('Loss Events')).toBeInTheDocument();
    expect(screen.getByText('KRI Dashboard')).toBeInTheDocument();
    expect(screen.getByText('RCSA')).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
  });

  it('Loss Events tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    const tab = screen.getByText('Loss Events');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to KRI Dashboard tab', async () => {
    setupHandlers();
    
    renderWithProviders(<OperationalRiskPage />);
    fireEvent.click(screen.getByText('KRI Dashboard'));
    const tab = screen.getByText('KRI Dashboard');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to RCSA tab', async () => {
    setupHandlers();
    
    renderWithProviders(<OperationalRiskPage />);
    fireEvent.click(screen.getByText('RCSA'));
    const tab = screen.getByText('RCSA');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Incidents tab', async () => {
    setupHandlers();
    
    renderWithProviders(<OperationalRiskPage />);
    fireEvent.click(screen.getByText('Incidents'));
    const tab = screen.getByText('Incidents');
    expect(tab.className).toContain('border-primary');
  });

  it('shows RCSA empty message on RCSA tab', async () => {
    setupHandlers();
    
    renderWithProviders(<OperationalRiskPage />);
    fireEvent.click(screen.getByText('RCSA'));
    await waitFor(() => {
      expect(screen.getByText('No RCSA assessments')).toBeInTheDocument();
    });
  });

  it('shows Incidents empty message on Incidents tab', async () => {
    setupHandlers();
    
    renderWithProviders(<OperationalRiskPage />);
    fireEvent.click(screen.getByText('Incidents'));
    await waitFor(() => {
      expect(screen.getByText('No incidents')).toBeInTheDocument();
    });
  });

  it('handles stats API error gracefully', () => {
    server.use(
      http.get('/api/v1/risk/operational/stats', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<OperationalRiskPage />);
    expect(screen.getByText('Operational Risk')).toBeInTheDocument();
  });

  it('handles loss events API error gracefully', () => {
    server.use(
      http.get('/api/v1/risk/operational/loss-events', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<OperationalRiskPage />);
    expect(screen.getByText('Operational Risk')).toBeInTheDocument();
  });

  it('does not show stat cards when stats are loading', () => {
    server.use(
      http.get('/api/v1/risk/operational/stats', () => new Promise(() => {})),
    );
    renderWithProviders(<OperationalRiskPage />);
    expect(screen.queryByText('Loss Events MTD')).not.toBeInTheDocument();
  });

  it('renders stat cards in a grid', async () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBe(5);
    });
  });

  it('renders tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<OperationalRiskPage />);
    const lossTab = screen.getByText('Loss Events');
    expect(lossTab.tagName).toBe('BUTTON');
  });

  it('renders without crashing when all APIs return empty', async () => {
    server.use(
      http.get('/api/v1/risk/operational/stats', () => HttpResponse.json(wrap({ lossEventsMtd: 0, totalLossMtd: 0, openIncidents: 0, krisBreached: 0, rcsaDue: 0, currency: 'NGN' }))),
      http.get('/api/v1/risk/operational/loss-events', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/risk/operational/loss-by-category', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/risk/operational/kris', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/risk/operational/rcsa', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/risk/operational/incidents', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<OperationalRiskPage />);
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
