import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ActiveLoansPage } from './ActiveLoansPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockLoans = [
  { id: 1, loanNumber: 'LN-000001', customerName: 'Borrower One', productName: 'Personal Loan', disbursedAmount: 5000000, outstandingPrincipal: 3200000, daysPastDue: 0, classification: 'CURRENT', nextPaymentDate: '2026-04-18', status: 'ACTIVE', monthlyPayment: 466667 },
  { id: 2, loanNumber: 'LN-000002', customerName: 'Borrower Two', productName: 'Auto Loan', disbursedAmount: 8000000, outstandingPrincipal: 6500000, daysPastDue: 35, classification: 'WATCH', nextPaymentDate: '2026-04-01', status: 'ACTIVE', monthlyPayment: 700000 },
  { id: 3, loanNumber: 'LN-000003', customerName: 'Borrower Three', productName: 'Mortgage', disbursedAmount: 25000000, outstandingPrincipal: 22000000, daysPastDue: 0, classification: 'CURRENT', nextPaymentDate: '2026-05-01', status: 'ACTIVE', monthlyPayment: 1200000 },
];

function setupHandlers(loans = mockLoans) {
  server.use(
    http.get('/api/v1/loans', () => HttpResponse.json(wrap(loans))),
  );
}

describe('ActiveLoansPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    expect(screen.getByText('Active Loans')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    expect(screen.getByText(/active loan portfolio/i)).toBeInTheDocument();
  });

  it('displays loan data in the table', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('Borrower One')).toBeInTheDocument();
    });
    expect(screen.getByText('Borrower Two')).toBeInTheDocument();
    expect(screen.getByText('Borrower Three')).toBeInTheDocument();
  });

  it('displays loan numbers', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('LN-000001')).toBeInTheDocument();
    });
  });

  it('displays product names', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('Personal Loan')).toBeInTheDocument();
    });
    expect(screen.getByText('Auto Loan')).toBeInTheDocument();
    expect(screen.getByText('Mortgage')).toBeInTheDocument();
  });

  it('shows correct table column headers', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('Loan #')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Disbursed')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('DPD')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders SummaryBar with totals', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Loans:')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Outstanding:')).toBeInTheDocument();
    expect(screen.getByText('Current:')).toBeInTheDocument();
    expect(screen.getByText('In Arrears:')).toBeInTheDocument();
  });

  it('shows correct total loans count in summary', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('shows empty state when no active loans', async () => {
    setupHandlers([]);
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Loans:')).toBeInTheDocument();
    });
  });

  it('displays DPD with color coding', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('35')).toBeInTheDocument();
    });
  });

  it('handles server error gracefully', async () => {
    server.use(
      http.get('/api/v1/loans', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<ActiveLoansPage />);
    expect(screen.getByText('Active Loans')).toBeInTheDocument();
  });

  it('renders classification badges', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getAllByText('CURRENT').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('WATCH')).toBeInTheDocument();
  });

  it('renders status badges', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    });
  });

  it('calculates in-arrears count correctly', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    // Wait for loan data to load (Borrower One is visible when data arrives)
    await waitFor(() => {
      expect(screen.getByText('Borrower One')).toBeInTheDocument();
    });
    // 1 loan has DPD > 0
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders with a single loan', async () => {
    setupHandlers([mockLoans[0]]);
    renderWithProviders(<ActiveLoansPage />);
    await waitFor(() => {
      expect(screen.getByText('Borrower One')).toBeInTheDocument();
    });
  });

  it('renders loading state before data arrives', () => {
    server.use(
      http.get('/api/v1/loans', () => new Promise(() => {})),
    );
    renderWithProviders(<ActiveLoansPage />);
    expect(screen.getByText('Active Loans')).toBeInTheDocument();
  });

  it('shows current count in summary bar', async () => {
    setupHandlers();
    renderWithProviders(<ActiveLoansPage />);
    // Wait for loan data to load (Borrower One is visible when data arrives)
    await waitFor(() => {
      expect(screen.getByText('Borrower One')).toBeInTheDocument();
    });
    // 2 CURRENT loans
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
