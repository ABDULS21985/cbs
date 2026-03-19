import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { LoanDashboardPage } from './LoanDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  totalOutstanding: 12300000000,
  activeLoansCount: 3456,
  activeLoansChange: 2.1,
  nplRatio: 3.8,
  disbursedMtd: 890000000,
  collectionsMtd: 1100000000,
};

const mockWatchList = [
  { id: 1, loanNumber: 'LN-000001', customerName: 'Risk Corp', productName: 'Commercial Loan', outstandingPrincipal: 50000000, daysPastDue: 45, classification: 'WATCH', provisionAmount: 5000000, status: 'ACTIVE' },
  { id: 2, loanNumber: 'LN-000002', customerName: 'Shaky Ltd', productName: 'Term Loan', outstandingPrincipal: 30000000, daysPastDue: 95, classification: 'SUBSTANDARD', provisionAmount: 6000000, status: 'ACTIVE' },
];

function setupHandlers(stats = mockStats, watchList = mockWatchList) {
  server.use(
    http.get('/api/v1/loans/portfolio/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/loans', () => HttpResponse.json(wrap(watchList))),
  );
}

describe('LoanDashboardPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText('Loan Portfolio')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText(/portfolio-level view/i)).toBeInTheDocument();
  });

  it('renders the "New Application" button', () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText('New Application')).toBeInTheDocument();
  });

  it('renders 5 stat cards', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Loans')).toBeInTheDocument();
    expect(screen.getByText('NPL Ratio')).toBeInTheDocument();
    expect(screen.getByText('Disbursed MTD')).toBeInTheDocument();
    expect(screen.getByText('Collections MTD')).toBeInTheDocument();
  });

  it('displays watch list loans in the table', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Risk Corp')).toBeInTheDocument();
    });
    expect(screen.getByText('Shaky Ltd')).toBeInTheDocument();
  });

  it('displays loan numbers', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('LN-000001')).toBeInTheDocument();
    });
    expect(screen.getByText('LN-000002')).toBeInTheDocument();
  });

  it('displays classification badges', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('WATCH')).toBeInTheDocument();
    });
    expect(screen.getByText('SUBSTANDARD')).toBeInTheDocument();
  });

  it('displays DPD values', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
    });
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('shows empty watch list when no loans returned', async () => {
    setupHandlers(mockStats, []);
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Watch List')).toBeInTheDocument();
    });
  });

  it('renders SummaryBar with watch list summary', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Watch List')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Exposure')).toBeInTheDocument();
    expect(screen.getByText('Total Provision')).toBeInTheDocument();
  });

  it('handles portfolio stats API error gracefully', async () => {
    server.use(
      http.get('/api/v1/loans/portfolio/stats', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/loans', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText('Loan Portfolio')).toBeInTheDocument();
  });

  it('handles watch list API error gracefully', async () => {
    server.use(
      http.get('/api/v1/loans/portfolio/stats', () => HttpResponse.json(wrap(mockStats))),
      http.get('/api/v1/loans', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText('Loan Portfolio')).toBeInTheDocument();
  });

  it('renders chart widgets', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText('DPD Distribution')).toBeInTheDocument();
    expect(screen.getByText('Classification Breakdown')).toBeInTheDocument();
  });

  it('shows the correct table columns', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Loan #')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('DPD')).toBeInTheDocument();
    expect(screen.getByText('Classification')).toBeInTheDocument();
    expect(screen.getByText('Provision')).toBeInTheDocument();
  });

  it('renders product names in watch list', async () => {
    setupHandlers();
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Commercial Loan')).toBeInTheDocument();
    });
    expect(screen.getByText('Term Loan')).toBeInTheDocument();
  });

  it('shows stat card default values when stats are loading', () => {
    server.use(
      http.get('/api/v1/loans/portfolio/stats', () => new Promise(() => {})),
      http.get('/api/v1/loans', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<LoanDashboardPage />);
    expect(screen.getByText('Total Outstanding')).toBeInTheDocument();
  });

  it('renders multiple watch list entries', async () => {
    const bigList = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      loanNumber: `LN-${String(i + 1).padStart(6, '0')}`,
      customerName: `Client ${i + 1}`,
      productName: 'Term Loan',
      outstandingPrincipal: 10000000,
      daysPastDue: 30 + i * 10,
      classification: 'WATCH',
      provisionAmount: 1000000,
      status: 'ACTIVE',
    }));
    setupHandlers(mockStats, bigList);
    renderWithProviders(<LoanDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Client 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Client 5')).toBeInTheDocument();
  });
});
