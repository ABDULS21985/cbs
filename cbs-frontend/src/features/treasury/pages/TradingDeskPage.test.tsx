import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { TradingDeskPage } from './TradingDeskPage';

const MOCK_DESKS = [
  {
    id: 'd1',
    code: 'FX-01',
    name: 'FX Trading Desk',
    assetClass: 'FX',
    status: 'ACTIVE',
    headDealerId: 'h1',
    headDealerName: 'John Doe',
    activeDeelersCount: 4,
    positionCount: 12,
    positionLimit: 20,
    utilizationPct: 60.0,
    todayPnl: 500_000,
    mtdPnl: 1_500_000,
  },
  {
    id: 'd2',
    code: 'FI-01',
    name: 'Fixed Income Desk',
    assetClass: 'FIXED_INCOME',
    status: 'ACTIVE',
    headDealerId: 'h2',
    headDealerName: 'Jane Smith',
    activeDeelersCount: 3,
    positionCount: 8,
    positionLimit: 15,
    utilizationPct: 53.3,
    todayPnl: -100_000,
    mtdPnl: 400_000,
  },
];

const MOCK_BOOKS = [
  {
    id: 'b1',
    bookCode: 'BOOK-FX-01',
    bookName: 'FX Spot Book',
    bookType: 'TRADING',
    deskId: 'd1',
    deskName: 'FX Trading Desk',
    status: 'ACTIVE',
    capitalRequirement: 10_000_000,
    capitalAllocated: 8_000_000,
    utilizationPct: 80.0,
    lastSnapshotAt: '2025-01-15T17:00:00Z',
    snapshotStatus: 'COMPLETED',
  },
];

const MOCK_ORDERS = [
  {
    id: 'o1',
    orderRef: 'ORD-001',
    instrument: 'DANGCEM',
    instrumentName: 'Dangote Cement',
    side: 'BUY',
    quantity: 10_000,
    price: 320.5,
    orderType: 'LIMIT',
    filledQuantity: 0,
    avgFillPrice: null,
    deskId: 'd1',
    deskName: 'FX Trading Desk',
    status: 'OPEN',
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-01-15T09:00:00Z',
    createdBy: 'trader1',
  },
];

const MOCK_POSITIONS: unknown[] = [];

function setupHandlers(overrides?: { desks?: unknown; books?: unknown; orders?: unknown }) {
  server.use(
    http.get('/api/v1/dealer-desks', () =>
      HttpResponse.json(overrides?.desks ?? MOCK_DESKS),
    ),
    http.get('/api/v1/trading-books', () =>
      HttpResponse.json(overrides?.books ?? MOCK_BOOKS),
    ),
    http.get('/api/v1/market-orders/open', () =>
      HttpResponse.json(overrides?.orders ?? MOCK_ORDERS),
    ),
    http.get('/api/v1/trader-positions/breaches', () =>
      HttpResponse.json(MOCK_POSITIONS),
    ),
  );
}

describe('TradingDeskPage', () => {
  it('renders page header "Trading Desk Management"', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText('Trading Desk Management')).toBeInTheDocument();
  });

  it('renders the page subtitle', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText(/Dealer desks, trading books/i)).toBeInTheDocument();
  });

  it('renders summary bar with Active Desks label', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText('Active Desks')).toBeInTheDocument();
  });

  it('renders summary bar with Today\'s P&L label', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText("Today's P&L")).toBeInTheDocument();
  });

  it('renders summary bar with Open Positions label', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText('Open Positions')).toBeInTheDocument();
  });

  it('renders summary bar with Trading Books label', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText('Trading Books')).toBeInTheDocument();
  });

  it('renders summary bar with Open Orders label', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByText('Open Orders')).toBeInTheDocument();
  });

  it('renders Dealer Desks tab', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByRole('tab', { name: /dealer desks/i })).toBeInTheDocument();
  });

  it('renders Trading Books tab', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByRole('tab', { name: /trading books/i })).toBeInTheDocument();
  });

  it('renders Trader Positions tab', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByRole('tab', { name: /trader positions/i })).toBeInTheDocument();
  });

  it('renders Market Orders tab', () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    expect(screen.getByRole('tab', { name: /market orders/i })).toBeInTheDocument();
  });

  it('renders desk cards with desk names', async () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.getByText('FX Trading Desk')).toBeInTheDocument();
      expect(screen.getByText('Fixed Income Desk')).toBeInTheDocument();
    });
  });

  it('renders desk codes in cards', async () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.getByText('FX-01')).toBeInTheDocument();
      expect(screen.getByText('FI-01')).toBeInTheDocument();
    });
  });

  it('renders head dealer names in desk cards', async () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    });
  });

  it('renders Today P&L labels inside desk cards', async () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Today P&L/i).length).toBeGreaterThan(0);
    });
  });

  it('renders utilization bars in desk cards', async () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Utilization/i).length).toBeGreaterThan(0);
    });
  });

  it('renders active dealers count in desk cards', async () => {
    setupHandlers();
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.getByText(/4 active dealers/i)).toBeInTheDocument();
    });
  });

  it('shows empty desks tab gracefully when no desks', async () => {
    setupHandlers({ desks: [] });
    renderWithProviders(<TradingDeskPage />);
    await waitFor(() => {
      expect(screen.queryByText('FX Trading Desk')).not.toBeInTheDocument();
    });
  });
});
