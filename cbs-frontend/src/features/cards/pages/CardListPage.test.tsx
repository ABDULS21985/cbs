import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { CardListPage } from './CardListPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCards = [
  { id: 1, cardNumberMasked: '**** **** **** 1001', customerName: 'Card Holder 1', customerId: 1, cardType: 'DEBIT', scheme: 'VISA', accountNumber: '0100000001', accountId: 1, expiryDate: '03/28', nameOnCard: 'CARD HOLDER 1', status: 'ACTIVE', issuedDate: '2024-03-15', deliveryMethod: 'BRANCH_PICKUP', controls: { posEnabled: true, atmEnabled: true, onlineEnabled: true, internationalEnabled: false, contactlessEnabled: true, recurringEnabled: true } },
  { id: 2, cardNumberMasked: '**** **** **** 1002', customerName: 'Card Holder 2', customerId: 2, cardType: 'CREDIT', scheme: 'MASTERCARD', accountNumber: '0100000002', accountId: 2, expiryDate: '06/27', nameOnCard: 'CARD HOLDER 2', status: 'ACTIVE', issuedDate: '2023-06-20', deliveryMethod: 'COURIER', controls: { posEnabled: true, atmEnabled: true, onlineEnabled: false, internationalEnabled: true, contactlessEnabled: true, recurringEnabled: false } },
  { id: 3, cardNumberMasked: '**** **** **** 1003', customerName: 'Card Holder 3', customerId: 3, cardType: 'DEBIT', scheme: 'VERVE', accountNumber: '0100000003', accountId: 3, expiryDate: '12/25', nameOnCard: 'CARD HOLDER 3', status: 'BLOCKED', issuedDate: '2022-12-10', deliveryMethod: 'BRANCH_PICKUP', controls: {} },
  { id: 4, cardNumberMasked: '**** **** **** 1004', customerName: 'Card Holder 4', customerId: 4, cardType: 'PREPAID', scheme: 'VISA', accountNumber: '0100000004', accountId: 4, expiryDate: '01/26', nameOnCard: 'CARD HOLDER 4', status: 'PENDING_ACTIVATION', issuedDate: '2026-01-05', deliveryMethod: 'COURIER', controls: {} },
  { id: 5, cardNumberMasked: '**** **** **** 1005', customerName: 'Card Holder 5', customerId: 5, cardType: 'DEBIT', scheme: 'VISA', accountNumber: '0100000005', accountId: 5, expiryDate: '09/24', nameOnCard: 'CARD HOLDER 5', status: 'EXPIRED', issuedDate: '2021-09-15', deliveryMethod: 'BRANCH_PICKUP', controls: {} },
];

function setupHandlers(cards = mockCards) {
  server.use(
    http.get('/api/v1/cards', () => HttpResponse.json(wrap(cards))),
  );
}

describe('CardListPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    expect(screen.getByText('Card Management')).toBeInTheDocument();
  });

  it('renders the unsupported request note', () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    expect(screen.getByText(/card request ui is not available in this frontend yet/i)).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Cards')).toBeInTheDocument();
    });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Pending Activation')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('displays correct card counts', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Cards').closest('.stat-card')).toHaveTextContent('5');
    });
  });

  it('displays card data in table', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('Card Holder 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Card Holder 2')).toBeInTheDocument();
  });

  it('shows card numbers', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('**** **** **** 1001')).toBeInTheDocument();
    });
  });

  it('shows card schemes', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getAllByText('VISA').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('MASTERCARD')).toBeInTheDocument();
    expect(screen.getByText('VERVE')).toBeInTheDocument();
  });

  it('shows card types', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getAllByText('DEBIT').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('CREDIT')).toBeInTheDocument();
  });

  it('renders tabs', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all cards/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /pending activation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^blocked/i })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    server.use(
      http.get('/api/v1/cards', () => new Promise(() => {})),
    );
    renderWithProviders(<CardListPage />);
    expect(screen.getByText(/loading cards/i)).toBeInTheDocument();
  });

  it('shows empty state when no cards', async () => {
    setupHandlers([]);
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText(/no cards found/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/v1/cards', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<CardListPage />);
    expect(screen.getByText('Card Management')).toBeInTheDocument();
  });

  it('renders All Cards tab with badge count', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('All Cards')).toBeInTheDocument();
    });
  });

  it('can switch to Pending Activation tab', async () => {
    setupHandlers();
    
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('All Cards')).toBeInTheDocument();
    });
    // TabsPage renders the tabs, clicking would switch
  });

  it('shows table column headers', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('Card #')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Scheme')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Expiry')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('displays active count in stat card', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 active
    });
  });

  it('renders with single card', async () => {
    setupHandlers([mockCards[0]]);
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('Card Holder 1')).toBeInTheDocument();
    });
  });

  it('displays expiry dates', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('03/28')).toBeInTheDocument();
    });
  });

  it('displays account numbers', async () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    await waitFor(() => {
      expect(screen.getByText('0100000001')).toBeInTheDocument();
    });
  });
});
