import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AccountDetailPage } from './AccountDetailPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

describe('AccountDetailPage', () => {
  it('renders the live account route with mapped detail and transaction data', async () => {
    server.use(
      http.get('/api/v1/accounts/:id', ({ params }) => {
        expect(params.id).toBe('0123456789');
        return HttpResponse.json(
          wrap({
            id: 501,
            accountNumber: '0123456789',
            accountName: 'Amara Primary Savings',
            productName: 'Standard Savings',
            productCategory: 'SAVINGS',
            currency: 'NGN',
            status: 'ACTIVE',
            availableBalance: 125000,
            ledgerBalance: 125000,
            lienAmount: 2500,
            branchCode: 'HQ01',
            openedDate: '2024-01-16',
            relationshipManager: 'RM-001',
            customerId: 101,
            customerDisplayName: 'Amara Okonkwo',
            applicableInterestRate: 3.75,
            accruedInterest: 410.5,
            statementFrequency: 'MONTHLY',
            lastInterestCalcDate: '2026-03-18',
            lastInterestPostDate: '2026-02-28',
            signatories: [
              { customerDisplayName: 'Amara Okonkwo', signatoryType: 'PRIMARY' },
            ],
          }),
        );
      }),
      http.get('/api/v1/accounts/:id/transactions', ({ params }) => {
        expect(params.id).toBe('0123456789');
        return HttpResponse.json(
          wrap([
            {
              id: 9001,
              transactionRef: 'TXN-0001',
              transactionType: 'CREDIT',
              amount: 50000,
              currencyCode: 'NGN',
              runningBalance: 125000,
              narration: 'Opening deposit',
              valueDate: '2024-01-16',
              postingDate: '2024-01-16',
              channel: 'BRANCH',
              status: 'POSTED',
            },
            {
              id: 9002,
              transactionRef: 'TXN-0002',
              transactionType: 'TRANSFER_OUT',
              amount: 12500,
              currencyCode: 'NGN',
              runningBalance: 112500,
              narration: 'Transfer to beneficiary',
              valueDate: '2024-01-17',
              postingDate: '2024-01-17',
              channel: 'MOBILE',
              status: 'POSTED',
            },
          ]),
        );
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/accounts/:id" element={<AccountDetailPage />} />
      </Routes>,
      { route: '/accounts/0123456789' },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Amara Primary Savings').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    expect(screen.getByText('HQ01')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /initiate transfer/i })).toHaveAttribute('href', '/payments/new');
    expect(screen.getByRole('link', { name: /statements/i })).toHaveAttribute('href', '/accounts/statements');
    expect(screen.queryByText('Deposit')).not.toBeInTheDocument();
    expect(screen.queryByText('Withdraw')).not.toBeInTheDocument();
    expect(screen.queryByText('Holds')).not.toBeInTheDocument();
    expect(screen.queryByText('Linked Products')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('TXN-0001')).toBeInTheDocument();
      expect(screen.getByText('Opening deposit')).toBeInTheDocument();
      expect(screen.getByText('Transfer to beneficiary')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Account Details'));

    await waitFor(() => {
      expect(screen.getByText('Relationship Manager')).toBeInTheDocument();
      expect(screen.getByText('RM-001')).toBeInTheDocument();
      expect(screen.getByText('Last Interest Posting')).toBeInTheDocument();
    });
  });
});
