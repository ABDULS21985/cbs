import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { LoanDetailPage } from './LoanDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// Mock uses backend DTO field names (mapLoanAccount transforms them)
const mockLoan = {
  id: 1,
  loanNumber: 'LN-000001',
  customerId: 1,
  customerDisplayName: 'Amara Okonkwo',
  loanProductCode: 'PERSONAL',
  loanProductName: 'Personal Loan',
  disbursedAmount: 5000000,
  outstandingPrincipal: 3200000,
  accruedInterest: 156789,
  interestRate: 18,
  tenureMonths: 12,
  remainingMonths: 8,
  emiAmount: 466667,
  nextDueDate: '2026-04-18',
  daysPastDue: 0,
  classification: 'CURRENT',
  status: 'ACTIVE',
  currencyCode: 'NGN',
  paidInstallments: 4,
  disbursementDate: '2026-01-18',
  maturityDate: '2027-01-18',
  schedule: [
    { installmentNumber: 1, dueDate: '2026-02-18T00:00:00.000Z', principalDue: 416667, interestDue: 50000, totalDue: 466667, status: 'PAID', outstanding: 4583333 },
    { installmentNumber: 2, dueDate: '2026-03-18T00:00:00.000Z', principalDue: 416667, interestDue: 45833, totalDue: 462500, status: 'PAID', outstanding: 4166666 },
    { installmentNumber: 3, dueDate: '2026-04-18T00:00:00.000Z', principalDue: 416667, interestDue: 41667, totalDue: 458334, status: 'DUE', outstanding: 3750000 },
  ],
};

const mockSchedule = [
  { installmentNumber: 1, dueDate: '2026-02-18T00:00:00.000Z', principalDue: 416667, interestDue: 50000, totalDue: 466667, status: 'PAID', outstanding: 4583333 },
  { installmentNumber: 2, dueDate: '2026-03-18T00:00:00.000Z', principalDue: 416667, interestDue: 45833, totalDue: 462500, status: 'PAID', outstanding: 4166666 },
  { installmentNumber: 3, dueDate: '2026-04-18T00:00:00.000Z', principalDue: 416667, interestDue: 41667, totalDue: 458334, status: 'DUE', outstanding: 3750000 },
];

function setupHandlers(loan = mockLoan, schedule = mockSchedule) {
  server.use(
    http.get('/api/v1/loans/:id', () => HttpResponse.json(wrap(loan))),
    http.get('/api/v1/loans/:id/schedule', () => HttpResponse.json(wrap(schedule))),
    http.get('/api/v1/loans/:id/payments', () => HttpResponse.json(wrap([]))),
  );
}

function renderPage(loanId = '1') {
  return renderWithProviders(
    <Routes>
      <Route path="/lending/:id" element={<LoanDetailPage />} />
    </Routes>,
    { route: `/lending/${loanId}` }
  );
}

describe('LoanDetailPage', () => {
  it('shows loading state initially', () => {
    setupHandlers();
    renderPage();
    expect(screen.getByText('Loan Detail')).toBeInTheDocument();
  });

  it('renders loan number in page header after loading', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Loan LN-000001')).toBeInTheDocument();
    });
  });

  it('renders loan subtitle with product and customer', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Personal Loan.*Amara Okonkwo/)).toBeInTheDocument();
    });
  });

  it('renders Record Payment button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Record Payment')).toBeInTheDocument();
    });
  });

  it('renders Restructure button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Restructure')).toBeInTheDocument();
    });
  });

  it('displays loan status badge', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    });
  });

  it('displays classification badge', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('CURRENT').length).toBeGreaterThan(0);
    });
  });

  it('displays InfoGrid with loan details', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Disbursed')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Outstanding').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Rate')).toBeInTheDocument();
    expect(screen.getAllByText('Remaining').length).toBeGreaterThanOrEqual(1);
  });

  it('displays interest rate', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('18% p.a.')).toBeInTheDocument();
    });
  });

  it('displays remaining tenor', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('8 of 12 months')).toBeInTheDocument();
    });
  });

  it('renders Schedule tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Schedule')).toBeInTheDocument();
    });
  });

  it('renders Payments tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });
  });

  it('renders Collateral tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Collateral')).toBeInTheDocument();
    });
  });

  it('shows schedule table with installments', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Due Date')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Principal').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Interest').length).toBeGreaterThanOrEqual(1);
  });

  it('shows schedule installment statuses', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('PAID').length).toBe(2);
    });
    expect(screen.getByText('DUE')).toBeInTheDocument();
  });

  it('can switch to Payments tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Payments'));
    await waitFor(() => {
      expect(screen.getByText(/no payments recorded/i)).toBeInTheDocument();
    });
  });

  it('can switch to Collateral tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Collateral')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Collateral'));
    await waitFor(() => {
      expect(screen.getByText(/no collateral linked/i)).toBeInTheDocument();
    });
  });

  it('displays currency in InfoGrid', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Currency')).toBeInTheDocument();
    });
    expect(screen.getByText('NGN')).toBeInTheDocument();
  });

  it('shows DPD when daysPastDue > 0', async () => {
    setupHandlers({ ...mockLoan, daysPastDue: 15 });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('15 DPD')).toBeInTheDocument();
    });
  });

  it('does not show DPD text when daysPastDue is 0', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Loan LN-000001')).toBeInTheDocument();
    });
    expect(screen.queryByText('0 DPD')).not.toBeInTheDocument();
  });

  it('shows "No schedule data" when schedule is empty', async () => {
    setupHandlers({ ...mockLoan, schedule: [] }, []);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no schedule data/i)).toBeInTheDocument();
    });
  });

  it('handles server error for loan fetch', async () => {
    server.use(
      http.get('/api/v1/loans/:id', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/loans/:id/schedule', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/loans/:id/payments', () => HttpResponse.json(wrap([]))),
    );
    renderPage();
    // Should show the loading/header state
    expect(screen.getByText('Loan Detail')).toBeInTheDocument();
  });
});
