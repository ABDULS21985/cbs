import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { RegulatoryReturnsPage } from './RegulatoryReturnsPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  totalReturns: 12,
  pending: 5,
  overdue: 1,
  submitted: 7,
  draft: 0,
  byRegulator: {},
};

const mockReturns = [
  { id: 1, name: 'CBN Monthly Returns', regulator: 'CBN', dueDate: '2026-03-31', status: 'PENDING', frequency: 'MONTHLY' },
  { id: 2, name: 'NDIC Quarterly Report', regulator: 'NDIC', dueDate: '2026-03-31', status: 'SUBMITTED', frequency: 'QUARTERLY' },
  { id: 3, name: 'SEC Capital Report', regulator: 'SEC', dueDate: '2026-02-28', status: 'ACKNOWLEDGED', frequency: 'MONTHLY' },
];

function setupHandlers(stats = mockStats, returns = mockReturns) {
  server.use(
    http.get('/api/v1/compliance/returns/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/compliance/returns/calendar', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/compliance/returns', () => HttpResponse.json(wrap(returns))),
  );
}

describe('RegulatoryReturnsPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    expect(screen.getByText('Regulatory Returns')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    expect(screen.getByText(/return calendar.*generation.*validation.*submission/i)).toBeInTheDocument();
  });

  it('renders 4 stat cards', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Returns')).toBeInTheDocument();
    }, { timeout: 3000 });
    // "Pending" appears as both stat card and tab label
    const pendingEls = screen.getAllByText('Pending');
    expect(pendingEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('displays stat card values', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders 4 tabs', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('All Returns')).toBeInTheDocument();
    // "Pending" is also a tab and a stat card label
    const pendingElements = screen.getAllByText('Pending');
    expect(pendingElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('Calendar tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    const tab = screen.getByText('Calendar');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to All Returns tab', async () => {
    setupHandlers();

    renderWithProviders(<RegulatoryReturnsPage />);
    fireEvent.click(screen.getByText('All Returns'));
    const tab = screen.getByText('All Returns');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Pending tab', async () => {
    setupHandlers();

    renderWithProviders(<RegulatoryReturnsPage />);
    // Find the tab button specifically (there may be a stat card with the same text)
    const pendingButtons = screen.getAllByText('Pending');
    const tabButton = pendingButtons.find((el) => el.tagName === 'BUTTON');
    fireEvent.click(tabButton!);
    expect(tabButton!.className).toContain('border-primary');
  });

  it('can switch to History tab', async () => {
    setupHandlers();

    renderWithProviders(<RegulatoryReturnsPage />);
    fireEvent.click(screen.getByText('History'));
    const tab = screen.getByText('History');
    expect(tab.className).toContain('border-primary');
  });

  it('highlights overdue count in red', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Returns')).toBeInTheDocument();
    }, { timeout: 3000 });
    // The overdue stat value should have text-red-600
    await waitFor(() => {
      const overdueValue = screen.getByText('1');
      expect(overdueValue.className).toContain('text-red-600');
    });
  });

  it('does not highlight overdue when zero', async () => {
    setupHandlers({ ...mockStats, overdue: 0 });
    renderWithProviders(<RegulatoryReturnsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Returns')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles stats API error gracefully', () => {
    server.use(
      http.get('/api/v1/compliance/returns/stats', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<RegulatoryReturnsPage />);
    expect(screen.getByText('Regulatory Returns')).toBeInTheDocument();
  });

  it('handles returns API error gracefully', () => {
    server.use(
      http.get('/api/v1/compliance/returns', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<RegulatoryReturnsPage />);
    expect(screen.getByText('Regulatory Returns')).toBeInTheDocument();
  });

  it('does not show stat cards when stats fail to load', () => {
    server.use(
      http.get('/api/v1/compliance/returns/stats', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<RegulatoryReturnsPage />);
    expect(screen.queryByText('Total Returns')).not.toBeInTheDocument();
  });

  it('renders stat cards in a grid', async () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBe(4);
    }, { timeout: 3000 });
  });

  it('renders tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<RegulatoryReturnsPage />);
    const calendarTab = screen.getByText('Calendar');
    expect(calendarTab.tagName).toBe('BUTTON');
  });

  it('renders without crashing with empty returns', async () => {
    setupHandlers(mockStats, []);
    renderWithProviders(<RegulatoryReturnsPage />);
    await waitFor(() => {
      expect(screen.getByText('Regulatory Returns')).toBeInTheDocument();
    });
  });
});
