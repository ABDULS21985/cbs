import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { AccountOpeningPage } from './AccountOpeningPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

describe('AccountOpeningPage', () => {
  it('maps the live account opening contract end to end', async () => {
    let complianceBody: Record<string, unknown> | null = null;
    let createBody: Record<string, unknown> | null = null;

    server.use(
      http.get('/api/v1/customers/quick-search', () =>
        HttpResponse.json(
          wrap([
            {
              id: 101,
              fullName: 'Amara Okonkwo',
              type: 'INDIVIDUAL',
              email: 'amara@example.com',
              phone: '+2348012345678',
            },
          ]),
        ),
      ),
      http.get('/api/v1/customers/101', () =>
        HttpResponse.json(
          wrap({
            id: 101,
            customerType: 'INDIVIDUAL',
            fullName: 'Amara Okonkwo',
            email: 'amara@example.com',
            phonePrimary: '+2348012345678',
            status: 'ACTIVE',
            metadata: { segment: 'Premier' },
            identifications: [
              { idType: 'BVN', idNumber: '12345678901', isVerified: true },
            ],
          }),
        ),
      ),
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(
          wrap([
            {
              id: 1,
              code: 'SAV-STD',
              name: 'Standard Savings',
              productCategory: 'SAVINGS',
              currencyCode: 'NGN',
              minOpeningBalance: 1000,
              monthlyMaintenanceFee: 0,
              baseInterestRate: 3.75,
              allowsDebitCard: true,
              allowsMobile: true,
              allowsInternet: true,
              isActive: true,
            },
          ]),
        ),
      ),
      http.post('/api/v1/accounts/compliance-check', async ({ request }) => {
        complianceBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json(
          wrap({
            kycVerified: true,
            kycLevel: 'FULL',
            amlClear: true,
            duplicateFound: false,
            dormantAccountExists: false,
          }),
        );
      }),
      http.post('/api/v1/accounts', async ({ request }) => {
        createBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json(
          wrap({
            id: 501,
            accountNumber: '0123456789',
            accountName: 'Amara Okonkwo',
            productName: 'Standard Savings',
            status: 'ACTIVE',
            currency: 'NGN',
          }),
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<AccountOpeningPage />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Amara Okonkwo'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Standard Savings'));
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expect(screen.getByText('Account Configuration')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/john doe or abc limited/i), {
      target: { value: 'Amara Primary Savings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue to compliance/i }));

    await waitFor(() => {
      expect(complianceBody).toEqual({
        customerId: 101,
        productCode: 'SAV-STD',
      });
      expect(screen.getByText(/all compliance checks passed/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /proceed to review/i }));

    await waitFor(() => {
      expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      expect(screen.getByText('Premier')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /open account/i }));

    await waitFor(() => {
      expect(createBody).toEqual({
        customerId: 101,
        productCode: 'SAV-STD',
        accountType: 'INDIVIDUAL',
        accountName: 'Amara Primary Savings',
        currencyCode: 'NGN',
        initialDeposit: 0,
        signatories: [],
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/account opened successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /view account/i })).toHaveAttribute('href', '/accounts/0123456789');
    });
  });
});
