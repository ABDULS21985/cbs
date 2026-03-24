import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { PortalTransferPage } from './PortalTransferPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  server.use(
    http.get('/api/v1/portal/accounts', () =>
      HttpResponse.json(wrap([
        {
          id: 1,
          accountNumber: '1000000001',
          accountName: 'Primary Savings',
          accountType: 'SAVINGS',
          balance: 600000,
          availableBalance: 600000,
          currency: 'NGN',
          status: 'ACTIVE',
        },
        {
          id: 2,
          accountNumber: '2000000002',
          accountName: 'Receiving Account',
          accountType: 'CURRENT',
          balance: 350000,
          availableBalance: 350000,
          currency: 'NGN',
          status: 'ACTIVE',
        },
      ]))),
    http.get('/api/v1/portal/beneficiaries', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/portal/transfers/limits', () =>
      HttpResponse.json(wrap({
        dailyLimit: 1000000,
        perTransactionLimit: 250000,
        usedToday: 50000,
        remainingDaily: 950000,
        otpThreshold: 50000,
      }))),
    http.post('/api/v1/portal/transfers/validate', async () =>
      HttpResponse.json(wrap({ found: true, accountName: 'Ada Customer' }))),
    http.post('/api/v1/portal/transfers/internal', async () =>
      HttpResponse.json(wrap({ status: 'SUCCESS', reference: 'TRF-001' }))),
  );
}

describe('PortalTransferPage', () => {
  it('submits a transfer below the otp threshold through to success', async () => {
    setupHandlers();
    const user = userEvent.setup();

    renderWithProviders(<PortalTransferPage />);

    await waitFor(() => {
      expect(screen.getByText('Transfer Money')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('0012345678'), '2000000002');
    await user.click(screen.getByRole('button', { name: /Validate recipient account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Beneficiary confirmed/i)).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('0.00'), '45000');
    await user.type(screen.getByPlaceholderText(/Payment for/i), 'March settlement');
    await user.click(screen.getByRole('button', { name: /Continue to Review/i }));

    await waitFor(() => {
      expect(screen.getByText('Review in progress')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Confirm and Send/i }));

    await waitFor(() => {
      expect(screen.getByText(/Transfer Successful/i)).toBeInTheDocument();
    });
  });
});
