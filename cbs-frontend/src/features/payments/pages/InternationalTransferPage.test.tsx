import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { InternationalTransferPage } from './InternationalTransferPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAccounts = [
  { id: 1, accountNumber: '0012345678', accountName: 'Main USD Account', currency: 'USD', availableBalance: 50000 },
];

const mockFxRates = [{
  sourceCurrency: 'NGN',
  targetCurrency: 'USD',
  buyRate: 1548.25,
  sellRate: 1552.75,
  midRate: 1550.50,
  rateDate: '2026-03-20',
  rateSource: 'Reuters',
}];

function setupHandlers() {
  server.use(
    http.get('/api/v1/accounts', () => HttpResponse.json(wrap(mockAccounts))),
    http.get('/api/v1/fx/rate', () => HttpResponse.json(wrap(mockFxRates))),
    http.get('/api/v1/payments/beneficiaries', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/payments/international/purpose-codes', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/payments/international/source-of-funds', () => HttpResponse.json(wrap([]))),
  );
}

describe('InternationalTransferPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<InternationalTransferPage />);
    expect(screen.getByText(/International Transfer/i)).toBeInTheDocument();
  });

  it('renders form fields', async () => {
    setupHandlers();
    renderWithProviders(<InternationalTransferPage />);
    await waitFor(() => {
      expect(screen.getByText(/Amount/i)).toBeInTheDocument();
    });
  });

  it('shows FX rate when available', async () => {
    setupHandlers();
    renderWithProviders(<InternationalTransferPage />);
    await waitFor(() => {
      expect(screen.getByText(/FX Conversion/i)).toBeInTheDocument();
      expect(screen.getByText(/1 NGN = 1550\.500000 USD/i)).toBeInTheDocument();
    });
  });
});
