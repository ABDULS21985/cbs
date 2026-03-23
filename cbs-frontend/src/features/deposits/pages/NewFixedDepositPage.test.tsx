import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { NewFixedDepositPage } from './NewFixedDepositPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockCustomer = {
  id: 201,
  customerNumber: 'CIF0000201',
  fullName: 'Amina Yusuf',
  type: 'INDIVIDUAL',
  status: 'ACTIVE',
};

const mockAccounts = [
  {
    id: 301,
    accountNumber: '1000001122',
    accountName: 'Amina Main Savings',
    accountType: 'SAVINGS',
    currency: 'NGN',
    availableBalance: 1250000,
    ledgerBalance: 1250000,
    status: 'ACTIVE',
  },
  {
    id: 302,
    accountNumber: '1000007788',
    accountName: 'Amina Reserve Current',
    accountType: 'CURRENT',
    currency: 'NGN',
    availableBalance: 450000,
    ledgerBalance: 450000,
    status: 'ACTIVE',
  },
];

const mockRates = [
  {
    tenor: 30,
    tenorLabel: '30 Days',
    standardRate: 7.5,
    premiumRate: 8.1,
  },
  {
    tenor: 90,
    tenorLabel: '90 Days',
    standardRate: 9.25,
    premiumRate: 10.1,
  },
];

function fixedDepositRecord(overrides?: Record<string, unknown>) {
  return {
    id: 'FD-9001',
    fdNumber: 'FD0009001',
    customerId: '201',
    customerName: 'Amina Yusuf',
    sourceAccountId: '301',
    sourceAccountNumber: '1000001122',
    principalAmount: 500000,
    currency: 'NGN',
    interestRate: 9.25,
    tenor: 90,
    tenorUnit: 'DAYS',
    startDate: '2026-03-23',
    maturityDate: '2026-06-21',
    grossInterest: 11404.11,
    wht: 1140.41,
    netInterest: 10263.70,
    maturityValue: 510263.70,
    maturityInstruction: 'ROLLOVER_ALL',
    status: 'ACTIVE',
    ...overrides,
  };
}

function setupBaseHandlers() {
  server.use(
    http.get('/api/v1/customers', () => HttpResponse.json(wrap([mockCustomer]))),
    http.get('/api/v1/accounts/customer/201', () => HttpResponse.json(wrap(mockAccounts))),
    http.get('/api/v1/deposits/fixed/rates', () => HttpResponse.json(wrap(mockRates))),
    http.post('/api/v1/deposits/fixed/calculate', async ({ request }) => {
      const body = (await request.json()) as { principal: number; rate: number; tenor: number };
      const grossInterest = body.principal * (body.rate / 100) * (body.tenor / 365);
      const wht = grossInterest * 0.10;
      const netInterest = grossInterest - wht;
      return HttpResponse.json(
        wrap({
          principal: body.principal,
          rate: body.rate,
          tenor: body.tenor,
          grossInterest,
          wht,
          netInterest,
          maturityValue: body.principal + netInterest,
        }),
      );
    }),
  );
}

function renderPage(route = '/accounts/fixed-deposits/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/accounts/fixed-deposits/new" element={<NewFixedDepositPage />} />
      <Route path="/accounts/fixed-deposits" element={<div>FD portfolio</div>} />
      <Route path="/accounts/fixed-deposits/:id" element={<div>FD detail page</div>} />
    </Routes>,
    { route },
  );
}

async function moveToPricingStep() {
  fireEvent.change(screen.getByLabelText(/customer search/i), { target: { value: 'Ami' } });

  await waitFor(() => {
    expect(screen.getByText('Amina Yusuf')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText('Amina Yusuf'));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /1000001122/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /1000001122/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue to pricing/i }));

  await waitFor(() => {
    expect(screen.getByText(/choose the rate band and tenor/i)).toBeInTheDocument();
  });
}

async function moveToMaturityStep() {
  await moveToPricingStep();

  fireEvent.click(screen.getByRole('button', { name: /90 days/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue to amount/i }));

  await waitFor(() => {
    expect(screen.getByLabelText(/principal amount/i)).toBeInTheDocument();
  });

  fireEvent.change(screen.getByLabelText(/principal amount/i), { target: { value: '500000' } });
  fireEvent.click(screen.getByRole('button', { name: /continue to maturity/i }));

  await waitFor(() => {
    expect(screen.getByText(/define the maturity path/i)).toBeInTheDocument();
  });
}

describe('NewFixedDepositPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('submits the live fixed-deposit payload and reaches the success screen', async () => {
    let postedBody: Record<string, unknown> | null = null;

    setupBaseHandlers();
    server.use(
      http.post('/api/v1/deposits/fixed', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(wrap(fixedDepositRecord()), { status: 201 });
      }),
    );

    renderPage();

    await moveToMaturityStep();

    fireEvent.click(screen.getByRole('button', { name: /continue to review/i }));

    await waitFor(() => {
      expect(screen.getByText(/confirm placement details/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create fixed deposit/i }));

    await waitFor(() => {
      expect(postedBody).toEqual({
        customerId: '201',
        sourceAccountId: '301',
        principalAmount: 500000,
        currency: 'NGN',
        tenor: 90,
        rate: 9.25,
        maturityInstruction: {
          type: 'ROLLOVER_ALL',
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/fixed deposit created/i)).toBeInTheDocument();
      expect(screen.getByText('FD0009001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view deposit/i }));

    await waitFor(() => {
      expect(screen.getByText('FD detail page')).toBeInTheDocument();
    });
  });

  it('requires a selected rate band before allowing a custom-tenor flow to continue', async () => {
    setupBaseHandlers();
    renderPage();

    await moveToPricingStep();

    fireEvent.change(screen.getByLabelText(/custom tenor override/i), { target: { value: '45' } });

    expect(screen.getByRole('button', { name: /continue to amount/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /30 days/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue to amount/i })).toBeEnabled();
    });
  });

  it('blocks liquidation review until a destination account is supplied', async () => {
    setupBaseHandlers();
    renderPage();

    await moveToMaturityStep();

    fireEvent.click(screen.getByText(/liquidate to account/i));

    expect(screen.getByRole('button', { name: /continue to review/i })).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '302' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue to review/i })).toBeEnabled();
    });
  });
});
