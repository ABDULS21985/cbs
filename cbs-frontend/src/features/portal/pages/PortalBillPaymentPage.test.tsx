import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { PortalBillPaymentPage } from './PortalBillPaymentPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  server.use(
    http.get('/api/v1/portal/billers', () =>
      HttpResponse.json(wrap([
        {
          id: 1,
          category: 'Electricity',
          name: 'Eko Electric',
          code: 'EKEDC',
          refLabel: 'Meter Number',
          fixedAmount: false,
        },
      ]))),
    http.get('/api/v1/portal/accounts', () =>
      HttpResponse.json(wrap([
        {
          id: 1,
          accountNumber: '1000000001',
          accountName: 'Primary Savings',
          accountType: 'SAVINGS',
          balance: 500000,
          availableBalance: 500000,
          currency: 'NGN',
          status: 'ACTIVE',
        },
      ]))),
    http.post('/api/v1/portal/billers/validate', async () =>
      HttpResponse.json(wrap({ customerName: 'Ada Lovelace' }))),
    http.post('/api/v1/portal/billers/pay', async () =>
      HttpResponse.json(wrap({ status: 'SUCCESS', reference: 'BILL-001' }))),
  );
}

describe('PortalBillPaymentPage', () => {
  it('completes the bill payment flow end to end', async () => {
    setupHandlers();
    const user = userEvent.setup();

    renderWithProviders(<PortalBillPaymentPage />);

    await screen.findByRole('button', { name: /Electricity/i });

    await user.click(screen.getByRole('button', { name: /Electricity/i }));
    await user.click(screen.getByRole('button', { name: /Eko Electric/i }));
    await user.type(screen.getByLabelText(/Meter Number/i), '1234567890');
    await user.type(screen.getByLabelText(/^Amount/i), '15000');
    await user.click(screen.getByRole('button', { name: /Validate and Continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/Pay from/i), '1');
    await user.click(screen.getByRole('button', { name: /Pay/i }));

    await waitFor(() => {
      expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();
    });
  });
});
