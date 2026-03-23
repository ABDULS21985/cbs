import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';
import { LoanTypeStep } from './LoanTypeStep';
import { SchedulePreviewStep } from './SchedulePreviewStep';
import { DocumentsStep } from './DocumentsStep';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function createState(overrides: Partial<LoanApplicationState> = {}): LoanApplicationState {
  return {
    step: 0,
    productCode: '',
    product: null,
    customerId: 41,
    customerName: 'Amara Okonkwo',
    amount: 1_000_000,
    purpose: 'Business expansion',
    tenorMonths: 12,
    interestRate: 18,
    repaymentMethod: 'EQUAL_INSTALLMENT',
    repaymentFrequency: 'MONTHLY',
    monthlyIncome: 500_000,
    monthlyExpenses: 150_000,
    existingObligations: 50_000,
    debtToIncomeRatio: 40,
    collateralItems: [],
    totalCollateralValue: 0,
    ltvRatio: 0,
    creditScore: null,
    creditRating: null,
    scoringDecision: null,
    schedulePreview: [],
    totalInterest: 0,
    totalRepayment: 0,
    documents: [],
    officerNotes: '',
    ...overrides,
  };
}

describe('Loan wizard API-driven steps', () => {
  it('loads loan products from the backend before selection', async () => {
    server.use(
      http.get('/api/v1/loans/products', () =>
        HttpResponse.json(wrap([{
          id: 7,
          code: 'MORT-001',
          name: 'Mortgage Plus',
          description: 'Residential mortgage product',
          loanType: 'MORTGAGE',
          currencyCode: 'NGN',
          minInterestRate: 12,
          maxInterestRate: 18,
          defaultInterestRate: 14,
          minLoanAmount: 5_000_000,
          maxLoanAmount: 250_000_000,
          minTenureMonths: 60,
          maxTenureMonths: 300,
          requiresCollateral: true,
          isActive: true,
        }])),
      ),
    );

    const updateField = vi.fn();
    const onNext = vi.fn();

    renderWithProviders(
      <LoanTypeStep state={createState()} updateField={updateField} onNext={onNext} />,
    );

    await screen.findByText('Mortgage Plus');
    fireEvent.click(screen.getByRole('button', { name: /mortgage plus/i }));

    expect(updateField).toHaveBeenCalledWith('productCode', 'MORT-001');
    expect(updateField).toHaveBeenCalledWith(
      'product',
      expect.objectContaining({
        productCode: 'MORT-001',
        productName: 'Mortgage Plus',
        minTenorMonths: 60,
        maxTenorMonths: 300,
      }),
    );
    expect(onNext).toHaveBeenCalled();
  });

  it('renders server-generated schedule previews', async () => {
    server.use(
      http.post('/api/v1/loans/schedule-preview', async () =>
        HttpResponse.json(wrap([
          {
            installmentNumber: 1,
            dueDate: '2026-04-23',
            principalDue: 80_000,
            interestDue: 20_000,
            totalDue: 100_000,
            principalPaid: 0,
            interestPaid: 0,
            totalPaid: 0,
            outstanding: 920_000,
            status: 'FUTURE',
          },
        ])),
      ),
    );

    const updateField = vi.fn();

    renderWithProviders(
      <SchedulePreviewStep
        state={createState({ productCode: 'BUS-001' })}
        updateField={updateField}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await screen.findByText('23 Apr 2026');

    await waitFor(() => {
      expect(updateField).toHaveBeenCalledWith(
        'schedulePreview',
        expect.arrayContaining([
          expect.objectContaining({ installmentNumber: 1, totalDue: 100_000 }),
        ]),
      );
    });
  });

  it('loads customer documents from the backend instead of a hardcoded checklist', async () => {
    server.use(
      http.get('/api/v1/customers/41/identifications', () =>
        HttpResponse.json(wrap([
          {
            id: 11,
            idType: 'INTERNATIONAL_PASSPORT',
            idNumber: 'A12345678',
            isVerified: true,
            expired: false,
            verifiedAt: '2026-03-20T09:00:00Z',
            documentUrl: 'https://example.test/passport.pdf',
          },
        ])),
      ),
    );

    const updateField = vi.fn();

    renderWithProviders(
      <DocumentsStep
        state={createState()}
        updateField={updateField}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await screen.findByText('INTERNATIONAL_PASSPORT');
    fireEvent.click(screen.getByRole('button', { name: /international_passport/i }));

    expect(updateField).toHaveBeenCalledWith('documents', [
      {
        name: 'INTERNATIONAL_PASSPORT',
        required: false,
        uploaded: true,
        fileRef: '11',
      },
    ]);
  });
});
