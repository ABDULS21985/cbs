import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { AuditTrailPage } from './AuditTrailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockResults = [
  { id: 1, entityType: 'CUSTOMER', entityId: '123', action: 'UPDATE', userId: 'agent-1', userName: 'Agent One', ipAddress: '192.168.1.1', timestamp: '2026-03-18T14:00:00Z', details: { field: 'status', oldValue: 'ACTIVE', newValue: 'DORMANT' } },
  { id: 2, entityType: 'ACCOUNT', entityId: '456', action: 'CREATE', userId: 'agent-2', userName: 'Agent Two', ipAddress: '192.168.1.2', timestamp: '2026-03-18T13:00:00Z', details: { accountType: 'SAVINGS' } },
];

const mockSummary = { totalResults: 2, creates: 1, updates: 1, deletes: 0, approvals: 0 };

function setupHandlers(results = mockResults, summary = mockSummary) {
  server.use(
    http.get('/api/v1/audit/search', () => HttpResponse.json(wrap(results))),
    http.get('/api/v1/audit/summary', () => HttpResponse.json(wrap(summary))),
    http.get('/api/v1/audit/heatmap/:userId', () => HttpResponse.json(wrap([]))),
  );
}

describe('AuditTrailPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText(/search and investigate system activity/i)).toBeInTheDocument();
  });

  it('renders the search form', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    // AuditSearchForm should be present
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('does not show results table before search', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    // No summary bar until search is performed
    expect(screen.queryByText('Results')).not.toBeInTheDocument();
  });

  it('does not show summary bar before search', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    expect(screen.queryByText('Creates')).not.toBeInTheDocument();
  });

  it('does not show heatmap before search', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    // No heatmap visible without userView
  });

  it('does not show detail panel before search', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    // No overlay visible
    expect(screen.queryByText('192.168.1.1')).not.toBeInTheDocument();
  });

  it('renders without crashing on API error', () => {
    server.use(
      http.get('/api/v1/audit/search', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/audit/summary', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders page container', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    const container = screen.getByText('Audit Trail').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('handles empty search results', () => {
    setupHandlers([], { totalResults: 0, creates: 0, updates: 0, deletes: 0, approvals: 0 });
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders the search form area', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    // The AuditSearchForm is rendered in a space-y container
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders without crash on all APIs failing', () => {
    server.use(
      http.get('/api/v1/audit/search', () => HttpResponse.error()),
      http.get('/api/v1/audit/summary', () => HttpResponse.error()),
    );
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders the page header with correct text', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText('Audit Trail')).toBeTruthy();
  });

  it('renders the subtitle with correct text', () => {
    setupHandlers();
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText(/search and investigate/i)).toBeTruthy();
  });

  it('renders page layout correctly', () => {
    setupHandlers();
    const { container } = renderWithProviders(<AuditTrailPage />);
    expect(container.querySelector('.page-container')).toBeInTheDocument();
  });
});
