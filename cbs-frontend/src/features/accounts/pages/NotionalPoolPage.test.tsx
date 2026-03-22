import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { NotionalPoolPage } from './NotionalPoolPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockPools = [
  {
    id: 1,
    poolCode: 'NP-001',
    poolName: 'Dangote Group Pool',
    poolType: 'MULTI_CURRENCY',
    customerId: 100,
    baseCurrency: 'NGN',
    interestCalcMethod: 'NET_BALANCE',
    creditRate: 2.0,
    debitRate: 8.0,
    advantageSpread: 0.5,
    notionalLimit: null,
    individualDebitLimit: null,
    lastCalcDate: null,
    netPoolBalance: 15000000,
    totalCreditBalances: 20000000,
    totalDebitBalances: 5000000,
    interestBenefitMtd: 12500,
    isActive: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-03-20',
  },
  {
    id: 2,
    poolCode: 'NP-002',
    poolName: 'TechCorp FX Pool',
    poolType: 'INTEREST_OPTIMIZATION',
    customerId: 200,
    baseCurrency: 'USD',
    interestCalcMethod: 'ADVANTAGE_RATE',
    creditRate: 1.5,
    debitRate: 6.0,
    advantageSpread: 0.25,
    notionalLimit: null,
    individualDebitLimit: null,
    lastCalcDate: null,
    netPoolBalance: 500000,
    totalCreditBalances: 750000,
    totalDebitBalances: 250000,
    interestBenefitMtd: 850,
    isActive: true,
    createdAt: '2024-03-20',
    updatedAt: '2024-03-22',
  },
];

const mockMembers = [
  {
    id: 1,
    accountId: 100,
    memberName: 'Dangote Cement',
    accountCurrency: 'NGN',
    currentBalance: 5000000,
    fxRateToBase: 1,
    balanceInBase: 5000000,
  },
  {
    id: 2,
    accountId: 101,
    memberName: 'Dangote Sugar',
    accountCurrency: 'NGN',
    currentBalance: 10000000,
    fxRateToBase: 1,
    balanceInBase: 10000000,
  },
];

describe('NotionalPoolPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  beforeEach(() => {
    server.use(
      http.get('/api/v1/notional-pools', () =>
        HttpResponse.json(wrap(mockPools)),
      ),
      http.get('/api/v1/notional-pools/:code/members', () =>
        HttpResponse.json(wrap(mockMembers)),
      ),
    );
  });

  it('renders the page title', () => {
    renderWithProviders(<NotionalPoolPage />);
    expect(screen.getByText('Notional Pooling')).toBeInTheDocument();
  });

  it('shows pool cards with names after loading', async () => {
    renderWithProviders(<NotionalPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Dangote Group Pool')).toBeInTheDocument();
    }, { timeout: 10_000 });
    expect(screen.getByText('TechCorp FX Pool')).toBeInTheDocument();
  });

  it('shows pool codes in pool card subtitles', async () => {
    renderWithProviders(<NotionalPoolPage />);

    await waitFor(() => {
      expect(screen.getByText('Dangote Group Pool')).toBeInTheDocument();
    }, { timeout: 10_000 });
    // Pool codes are rendered inside a subtitle with "NP-001 · MULTI CURRENCY · NGN"
    expect(screen.getByText(/NP-001/)).toBeInTheDocument();
    expect(screen.getByText(/NP-002/)).toBeInTheDocument();
  });

  it('shows empty state when no pools exist', async () => {
    server.use(
      http.get('/api/v1/notional-pools', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(<NotionalPoolPage />);

    await waitFor(() => {
      expect(screen.getByText(/No notional pools configured yet/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    server.use(
      http.get('/api/v1/notional-pools', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return HttpResponse.json(wrap([]));
      }),
    );

    renderWithProviders(<NotionalPoolPage />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
