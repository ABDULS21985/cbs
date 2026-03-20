import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { TreasuryDealsPage } from './TreasuryDealsPage';

const MOCK_DEALS = [
  {
    id: '1',
    dealRef: 'TXN-001',
    type: 'FX',
    counterparty: 'UBA',
    currency: 'USD',
    amount: 1_000_000,
    rate: 0.0108,
    maturityDate: '2025-06-01',
    deskId: 'd1',
    deskName: 'FX Desk',
    status: 'BOOKED',
    bookedAt: '2025-01-01T10:00:00Z',
    createdBy: 'trader1',
  },
  {
    id: '2',
    dealRef: 'TXN-002',
    type: 'BOND',
    counterparty: 'GTB',
    currency: 'NGN',
    amount: 5_000_000,
    rate: 0.14,
    maturityDate: '2026-01-01',
    deskId: 'd2',
    deskName: 'Fixed Income',
    status: 'CONFIRMED',
    bookedAt: '2025-01-02T10:00:00Z',
    createdBy: 'trader2',
  },
];

const MOCK_DESKS = [
  { id: 'd1', code: 'FX-01', name: 'FX Desk', assetClass: 'FX', status: 'ACTIVE', headDealerId: 'h1', headDealerName: 'John Doe', activeDeelersCount: 4, positionCount: 12, positionLimit: 20, utilizationPct: 60, todayPnl: 50000, mtdPnl: 150000 },
];

function setupHandlers(overrides?: { deals?: unknown }) {
  server.use(
    http.get('/api/v1/treasury/deals', () =>
      HttpResponse.json(overrides?.deals ?? MOCK_DEALS),
    ),
    http.post('/api/v1/treasury/deals', () =>
      HttpResponse.json(MOCK_DEALS[0], { status: 201 }),
    ),
    http.get('/api/v1/dealer-desks', () =>
      HttpResponse.json(MOCK_DESKS),
    ),
  );
}

describe('TreasuryDealsPage', () => {
  it('renders page header "Treasury Deals"', () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    expect(screen.getByText('Treasury Deals')).toBeInTheDocument();
  });

  it('renders the page subtitle', () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    expect(screen.getByText(/Manage FX, repo, bond/i)).toBeInTheDocument();
  });

  it('shows Book Deal button', () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    expect(screen.getByRole('button', { name: /book deal/i })).toBeInTheDocument();
  });

  it('renders deal data in the table', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByText('TXN-001')).toBeInTheDocument();
      expect(screen.getByText('TXN-002')).toBeInTheDocument();
    });
  });

  it('renders counterparty names in the table', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByText('UBA')).toBeInTheDocument();
      expect(screen.getByText('GTB')).toBeInTheDocument();
    });
  });

  it('shows Status filter select', () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    const statusSelects = screen.getAllByRole('combobox');
    expect(statusSelects.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Type filter select', () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('shows deals count text', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByText(/2 deals/i)).toBeInTheDocument();
    });
  });

  it('shows Confirm button for BOOKED deals', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  it('shows Settle button for CONFIRMED deals', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /settle/i })).toBeInTheDocument();
    });
  });

  it('opens Book Deal dialog when Book Deal button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    fireEvent.click(screen.getByRole('button', { name: /book deal/i }));
    await waitFor(() => {
      expect(screen.getByText('Book New Deal')).toBeInTheDocument();
    });
  });

  it('shows Deal Type and Currency fields inside Book Deal dialog', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    fireEvent.click(screen.getByRole('button', { name: /book deal/i }));
    await waitFor(() => {
      expect(screen.getByText('Deal Type')).toBeInTheDocument();
      expect(screen.getByText('Currency')).toBeInTheDocument();
    });
  });

  it('shows Counterparty input in Book Deal dialog', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    fireEvent.click(screen.getByRole('button', { name: /book deal/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Access Bank PLC/i)).toBeInTheDocument();
    });
  });

  it('closes Book Deal dialog when Cancel is clicked', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    fireEvent.click(screen.getByRole('button', { name: /book deal/i }));
    await waitFor(() => expect(screen.getByText('Book New Deal')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByText('Book New Deal')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no deals', async () => {
    setupHandlers({ deals: [] });
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByText(/No deals match your filters/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when deals API fails', async () => {
    server.use(
      http.get('/api/v1/treasury/deals', () => HttpResponse.error()),
      http.get('/api/v1/dealer-desks', () => HttpResponse.json(MOCK_DESKS)),
    );
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load deals/i)).toBeInTheDocument();
    });
  });

  it('shows Retry button on error', async () => {
    server.use(
      http.get('/api/v1/treasury/deals', () => HttpResponse.error()),
      http.get('/api/v1/dealer-desks', () => HttpResponse.json(MOCK_DESKS)),
    );
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('shows deal column headers', async () => {
    setupHandlers();
    renderWithProviders(<TreasuryDealsPage />);
    await waitFor(() => {
      expect(screen.getByText('Deal Ref')).toBeInTheDocument();
      expect(screen.getByText('Counterparty')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });
});
