import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { SanctionsScreeningPage } from '../pages/SanctionsScreeningPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  total: 150,
  pending: 8,
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/sanctions/stats', () => HttpResponse.json(wrap(mockStats))),
    http.get('/api/v1/sanctions/matches', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json(wrap([]))),
  );
}

describe('SanctionsScreeningPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Sanctions Screening')).toBeInTheDocument();
  });

  it('renders Live Screening Active indicator', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Live Screening Active')).toBeInTheDocument();
  });

  it('renders Screen Name button', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Screen Name')).toBeInTheDocument();
  });

  it('renders all 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Confirmed Hits')).toBeInTheDocument();
    expect(screen.getByText('False Positives')).toBeInTheDocument();
    expect(screen.getByText('Watchlists')).toBeInTheDocument();
    expect(screen.getByText('Batch Screening')).toBeInTheDocument();
  });

  it('can switch between tabs', () => {
    setupHandlers();
    renderWithProviders(<SanctionsScreeningPage />);

    fireEvent.click(screen.getByText('Confirmed Hits'));
    const confirmedTab = screen.getByText('Confirmed Hits');
    expect(confirmedTab.closest('button')?.className ?? confirmedTab.className).toContain('border-primary');

    fireEvent.click(screen.getByText('False Positives'));
    const fpTab = screen.getByText('False Positives');
    expect(fpTab.closest('button')?.className ?? fpTab.className).toContain('border-primary');

    fireEvent.click(screen.getByText('Watchlists'));
    const watchlistsTab = screen.getByText('Watchlists');
    expect(watchlistsTab.closest('button')?.className ?? watchlistsTab.className).toContain('border-primary');

    fireEvent.click(screen.getByText('Batch Screening'));
    const batchTab = screen.getByText('Batch Screening');
    expect(batchTab.closest('button')?.className ?? batchTab.className).toContain('border-primary');
  });

  it('handles API errors gracefully', () => {
    server.use(
      http.get('/api/v1/sanctions/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/matches', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/sanctions/watchlists', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<SanctionsScreeningPage />);
    expect(screen.getByText('Sanctions Screening')).toBeInTheDocument();
  });
});
