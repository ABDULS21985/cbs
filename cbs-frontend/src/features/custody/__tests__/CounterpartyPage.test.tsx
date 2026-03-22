import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { CounterpartyPage } from '../pages/CounterpartyPage';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ALL_CPS = {
  data: [
    {
      id: 1, counterpartyCode: 'CP-TEST001', counterpartyName: 'Test Bank AG',
      counterpartyType: 'BANK', lei: '5493001KJTIIGC8Y1R12', bicCode: 'TESTDEFF',
      country: 'DE', creditRating: 'AA-', ratingAgency: 'S&P',
      totalExposureLimit: 10000000, currentExposure: 7500000, availableLimit: 2500000,
      nettingAgreement: true, isdaAgreement: true, csaAgreement: false,
      kycStatus: 'VERIFIED', riskCategory: 'LOW', status: 'ACTIVE',
    },
    {
      id: 2, counterpartyCode: 'CP-TEST002', counterpartyName: 'Broker Corp',
      counterpartyType: 'BROKER_DEALER', country: 'US', creditRating: 'BBB+',
      ratingAgency: 'FITCH', totalExposureLimit: 5000000, currentExposure: 4500000,
      availableLimit: 500000, nettingAgreement: false, isdaAgreement: false,
      csaAgreement: false, kycStatus: 'PENDING', riskCategory: 'HIGH', status: 'ACTIVE',
    },
  ],
};

const MOCK_PENDING_KYC = { data: [MOCK_ALL_CPS.data[1]] };

// ── Setup ────────────────────────────────────────────────────────────────────

function setupHandlers() {
  server.use(
    http.get('/api/v1/counterparties', ({ request }) => {
      const url = new URL(request.url);
      // The pending-kyc endpoint is a separate path
      if (url.pathname.endsWith('/pending-kyc')) {
        return HttpResponse.json(MOCK_PENDING_KYC);
      }
      return HttpResponse.json(MOCK_ALL_CPS);
    }),
    http.get('/api/v1/counterparties/pending-kyc', () =>
      HttpResponse.json(MOCK_PENDING_KYC),
    ),
    http.post('/api/v1/counterparties', () =>
      HttpResponse.json({ data: MOCK_ALL_CPS.data[0] }, { status: 201 }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CounterpartyPage', () => {
  it('renders page header "Counterparty Management"', () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    expect(screen.getByText('Counterparty Management')).toBeInTheDocument();
  });

  it('shows tabs: All Counterparties, KYC Review, Exposure Dashboard', () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    expect(screen.getByText('All Counterparties')).toBeInTheDocument();
    expect(screen.getByText('KYC Review')).toBeInTheDocument();
    expect(screen.getByText('Exposure Dashboard')).toBeInTheDocument();
  });

  it('type filter buttons include ALL, BANK, BROKER_DEALER and other types', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'BANK' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'BROKER DEALER' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'INSURANCE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'FUND MANAGER' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CORPORATE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SOVEREIGN' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CENTRAL BANK' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CLEARING HOUSE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'EXCHANGE' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SPV' })).toBeInTheDocument();
    });
  });

  it('New Counterparty button is shown', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new counterparty/i })).toBeInTheDocument();
    });
  });

  it('table displays counterparty data', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    await waitFor(() => {
      expect(screen.getByText('CP-TEST001')).toBeInTheDocument();
      expect(screen.getByText('Test Bank AG')).toBeInTheDocument();
      expect(screen.getByText('CP-TEST002')).toBeInTheDocument();
      expect(screen.getByText('Broker Corp')).toBeInTheDocument();
    });
  });

  it('shows credit ratings in the table', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    await waitFor(() => {
      expect(screen.getByText('AA-')).toBeInTheDocument();
      expect(screen.getByText('BBB+')).toBeInTheDocument();
    });
  });

  it('shows stat cards with counterparty summary data', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Counterparties')).toBeInTheDocument();
      expect(screen.getByText('Total Exposure')).toBeInTheDocument();
      expect(screen.getByText('Available Limit')).toBeInTheDocument();
      expect(screen.getByText('KYC Pending')).toBeInTheDocument();
      expect(screen.getByText('High Risk')).toBeInTheDocument();
    });
  });

  it('KYC Review tab shows pending counterparties', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    fireEvent.click(screen.getByText('KYC Review'));
    await waitFor(() => {
      expect(screen.getByText('CP-TEST002')).toBeInTheDocument();
      expect(screen.getByText('Broker Corp')).toBeInTheDocument();
    });
  });

  it('KYC Review tab shows alert banner for pending reviews', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    fireEvent.click(screen.getByText('KYC Review'));
    await waitFor(() => {
      expect(screen.getByText(/require KYC review/i)).toBeInTheDocument();
    });
  });

  it('Exposure Dashboard tab shows Total Portfolio Exposure gauge', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    fireEvent.click(screen.getByText('Exposure Dashboard'));
    await waitFor(() => {
      expect(screen.getByText('Total Portfolio Exposure')).toBeInTheDocument();
    });
  });

  it('Exposure Dashboard tab shows Top 10 Exposures chart', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    fireEvent.click(screen.getByText('Exposure Dashboard'));
    await waitFor(() => {
      expect(screen.getByText('Top 10 Exposures')).toBeInTheDocument();
    });
  });

  it('Exposure Dashboard tab shows Concentration by Type chart', async () => {
    setupHandlers();
    renderWithProviders(<CounterpartyPage />);
    fireEvent.click(screen.getByText('Exposure Dashboard'));
    await waitFor(() => {
      expect(screen.getByText('Concentration by Type')).toBeInTheDocument();
    });
  });
});
