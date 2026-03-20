import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '@/test/factories/userFactory';
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
];

function renderCardDetail(cardId = '1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });

  useAuthStore.setState({
    user: createMockUser(),
    accessToken: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/cards/${cardId}`]}>
        <Routes>
          <Route path="/cards/:id" element={<CardDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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
    renderCardDetail();
    expect(screen.getByText('Card Detail')).toBeInTheDocument();
  });

  it('renders card visual with masked number', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('**** **** **** 4532')).toBeInTheDocument();
    });
  });

  it('renders card holder name', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
    });
  });

  it('renders page header with card info', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('Card **** **** **** 4532')).toBeInTheDocument();
    });
  });

  it('renders info grid fields', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getAllByText('Card Type').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Scheme').length).toBeGreaterThan(0);
  });

  it('renders quick action buttons for active card', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('Lock Card')).toBeInTheDocument();
    });
    expect(screen.getByText('Set PIN')).toBeInTheDocument();
    expect(screen.getByText('Replace')).toBeInTheDocument();
  });

  it('shows Unlock button for blocked card', async () => {
    setupHandlers({ ...mockCard, status: 'BLOCKED' });
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('Unlock')).toBeInTheDocument();
    });
  });

  it('renders tabs', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('renders error state when card is undefined', () => {
    renderCardDetail('0');
    // With id=0, useCard is disabled → card is undefined → error path
    expect(screen.getAllByText('Network Error').length).toBeGreaterThan(0);
    expect(screen.getByText('Failed to load card details. Check your connection.')).toBeInTheDocument();
  });

  it('renders card expiry date on visual', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
    });
    // Expiry should appear on the card visual
    expect(screen.getAllByText('03/28').length).toBeGreaterThan(0);
  });

  it('renders VISA scheme on card visual', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getAllByText('VISA').length).toBeGreaterThan(0);
    });
  });

  it('renders account number', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
    });
    expect(screen.getAllByText('0100000001').length).toBeGreaterThan(0);
  });

  it('card visual has aria-label', async () => {
    setupHandlers();
    renderCardDetail();
    await waitFor(() => {
      const visual = screen.getByRole('img', { name: /VISA DEBIT card ending in 4532/ });
      expect(visual).toBeInTheDocument();
    });
  });
});
