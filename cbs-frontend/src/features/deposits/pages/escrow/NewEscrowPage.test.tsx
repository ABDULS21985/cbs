import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { NewEscrowPage } from './NewEscrowPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

function renderPage(route = '/accounts/escrow/new') {
  return renderWithProviders(
    <Routes>
      <Route path="/accounts/escrow/new" element={<NewEscrowPage />} />
      <Route path="/accounts/escrow" element={<div>Escrow register</div>} />
      <Route path="/accounts/escrow/:id" element={<div>Escrow detail page</div>} />
    </Routes>,
    { route },
  );
}

describe('NewEscrowPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('submits a cleaned create payload and omits cleared optional identifiers', async () => {
    let postedBody: Record<string, unknown> | null = null;

    server.use(
      http.post('/api/v1/escrow', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json(
          wrap({
            id: 701,
            mandateNumber: 'ESC-000701',
            accountId: 9981,
            accountNumber: '1000009981',
            customerId: 45,
            customerDisplayName: 'Ada Obi',
            escrowType: 'ESCROW',
            purpose: postedBody?.purpose,
            depositorName: null,
            beneficiaryName: null,
            releaseConditions: postedBody?.releaseConditions ?? [],
            requiresMultiSign: false,
            requiredSignatories: null,
            mandatedAmount: postedBody?.mandatedAmount,
            releasedAmount: 0,
            remainingAmount: postedBody?.mandatedAmount,
            currencyCode: postedBody?.currencyCode,
            effectiveDate: '2026-03-23',
            expiryDate: postedBody?.expiryDate ?? null,
            status: 'ACTIVE',
            releases: [],
            createdAt: '2026-03-23T10:00:00Z',
          }),
          { status: 201 },
        );
      }),
    );

    renderPage();

    fireEvent.change(screen.getByLabelText(/funding account id/i), { target: { value: '9981' } });
    fireEvent.change(screen.getByLabelText(/mandated amount/i), { target: { value: '2500000' } });
    fireEvent.change(screen.getByLabelText(/mandate purpose/i), {
      target: { value: 'Hold project retention until completion certificate is delivered.' },
    });
    fireEvent.change(screen.getByLabelText(/depositor customer id/i), { target: { value: '110' } });
    fireEvent.change(screen.getByLabelText(/depositor customer id/i), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText(/release condition 1/i), {
      target: { value: ' Signed completion certificate ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create mandate/i }));

    await waitFor(() => {
      expect(postedBody).toEqual({
        accountId: 9981,
        escrowType: 'ESCROW',
        purpose: 'Hold project retention until completion certificate is delivered.',
        mandatedAmount: 2500000,
        currencyCode: 'NGN',
        releaseConditions: ['Signed completion certificate'],
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/escrow mandate submitted/i)).toBeInTheDocument();
    });
  });

  it('includes multi-sign controls and can open the created mandate', async () => {
    server.use(
      http.post('/api/v1/escrow', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;

        expect(body).toMatchObject({
          escrowType: 'TRUST',
          requiresMultiSign: true,
          requiredSignatories: 3,
          beneficiaryCustomerId: 212,
        });

        return HttpResponse.json(
          wrap({
            id: 702,
            mandateNumber: 'ESC-000702',
            accountId: 5511,
            accountNumber: '1000005511',
            customerId: 52,
            customerDisplayName: 'Northwind Trustees',
            escrowType: 'TRUST',
            purpose: body.purpose,
            depositorName: null,
            beneficiaryName: 'Beneficiary',
            releaseConditions: body.releaseConditions ?? [],
            requiresMultiSign: true,
            requiredSignatories: 3,
            mandatedAmount: body.mandatedAmount,
            releasedAmount: 0,
            remainingAmount: body.mandatedAmount,
            currencyCode: body.currencyCode,
            effectiveDate: '2026-03-23',
            expiryDate: null,
            status: 'ACTIVE',
            releases: [],
            createdAt: '2026-03-23T10:05:00Z',
          }),
          { status: 201 },
        );
      }),
    );

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /trust/i }));
    fireEvent.change(screen.getByLabelText(/funding account id/i), { target: { value: '5511' } });
    fireEvent.change(screen.getByLabelText(/mandated amount/i), { target: { value: '880000' } });
    fireEvent.change(screen.getByLabelText(/mandate purpose/i), {
      target: { value: 'Trust arrangement for managed disbursement to appointed beneficiaries.' },
    });
    fireEvent.change(screen.getByLabelText(/beneficiary customer id/i), { target: { value: '212' } });
    fireEvent.click(screen.getByLabelText(/enable multi-sign release approval/i));
    fireEvent.change(screen.getByLabelText(/required signatories/i), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText(/release condition 1/i), {
      target: { value: 'Trustee board approval' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create mandate/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view mandate/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /view mandate/i }));

    await waitFor(() => {
      expect(screen.getByText('Escrow detail page')).toBeInTheDocument();
    });
  });
});
