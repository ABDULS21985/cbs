import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardDetailPage } from './CardDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCard = {
  id: 1,
  cardNumberMasked: '**** **** **** 4532',
  customerName: 'John Doe',
  customerId: 101,
  cardType: 'DEBIT',
  scheme: 'VISA',
  accountNumber: '0100000001',
  accountId: 1,
  expiryDate: '03/28',
  nameOnCard: 'JOHN DOE',
  status: 'ACTIVE',
  issuedDate: '2024-03-15',
  deliveryMethod: 'BRANCH_PICKUP',
  controls: {
    posEnabled: true,
    atmEnabled: true,
    onlineEnabled: false,
    internationalEnabled: false,
    contactlessEnabled: true,
    recurringEnabled: true,
  },
};

const mockTransactions = [
  {
    id: 1, transactionRef: 'TXN001', cardMasked: '4532', merchantName: 'Shoprite',
    merchantId: 'M001', mcc: '5411', mccDescription: 'Grocery Stores',
    amount: 15000, currency: 'NGN', authCode: 'A123', responseCode: '00',
    responseDescription: 'Approved', channel: 'POS', transactionDate: '2024-03-15',
    status: 'APPROVED', fraudScore: 5,
  },
  {
    id: 2, transactionRef: 'TXN002', cardMasked: '4532', merchantName: 'Amazon',
    merchantId: 'M002', mcc: '5999', mccDescription: 'Online Retail',
    amount: 45000, currency: 'NGN', authCode: '', responseCode: '51',
    responseDescription: 'Insufficient funds', channel: 'ONLINE', transactionDate: '2024-03-14',
    status: 'DECLINED', fraudScore: 65,
  },
];

function setupHandlers(card = mockCard, txns = mockTransactions) {
  server.use(
    http.get('/api/v1/cards/:id', () => HttpResponse.json(wrap(card))),
    http.get('/api/v1/card-switch', () => HttpResponse.json(wrap(txns))),
    http.get('/api/v1/cards/disputes/status/:status', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/cards/tokens/card/:cardId', () => HttpResponse.json(wrap([]))),
  );
}

describe('CardDetailPage', () => {
  it('renders loading skeleton', () => {
    server.use(http.get('/api/v1/cards/:id', () => new Promise(() => {})));
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    expect(screen.getByText('Card Detail')).toBeInTheDocument();
  });

  it('renders error state with retry', async () => {
    server.use(
      http.get('/api/v1/cards/:id', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('Server Error')).toBeInTheDocument();
    });
  });

  it('renders card visual with masked number', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('**** **** **** 4532')).toBeInTheDocument();
    });
  });

  it('renders card holder name', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
    });
  });

  it('renders page header with card info', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('Card **** **** **** 4532')).toBeInTheDocument();
    });
  });

  it('renders info grid fields', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('Card Type')).toBeInTheDocument();
    });
    expect(screen.getByText('Scheme')).toBeInTheDocument();
    expect(screen.getByText('Linked Account')).toBeInTheDocument();
  });

  it('renders quick action buttons for active card', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('Lock Card')).toBeInTheDocument();
    });
    expect(screen.getByText('Set PIN')).toBeInTheDocument();
    expect(screen.getByText('Replace')).toBeInTheDocument();
    expect(screen.getByText('Lost/Stolen')).toBeInTheDocument();
  });

  it('shows Unlock button for blocked card', async () => {
    setupHandlers({ ...mockCard, status: 'BLOCKED' });
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('Unlock')).toBeInTheDocument();
    });
  });

  it('renders tabs', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Tokenization')).toBeInTheDocument();
    expect(screen.getByText('Disputes')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });

  it('shows 404 when card not found', async () => {
    server.use(
      http.get('/api/v1/cards/:id', () => HttpResponse.json({ message: 'Not found' }, { status: 404 })),
    );
    renderWithProviders(<CardDetailPage />, { route: '/cards/999', routerProps: { initialEntries: ['/cards/999'] } });
    await waitFor(() => {
      expect(screen.getByText('Card not found')).toBeInTheDocument();
    });
  });

  it('renders card expiry date', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('03/28')).toBeInTheDocument();
    });
  });

  it('renders card scheme on visual', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getAllByText('VISA').length).toBeGreaterThan(0);
    });
  });

  it('renders account number in info grid', async () => {
    setupHandlers();
    renderWithProviders(<CardDetailPage />, { route: '/cards/1', routerProps: { initialEntries: ['/cards/1'] } });
    await waitFor(() => {
      expect(screen.getByText('0100000001')).toBeInTheDocument();
    });
  });
});
