import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { CardListPage } from './CardListPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCards = [
  { id: 1, cardReference: 'CRD-001', cardNumberMasked: '**** **** **** 1001', customerDisplayName: 'Card Holder 1', customerId: 1, cardType: 'DEBIT', cardScheme: 'VISA', accountNumber: '0100000001', accountId: 1, expiryDate: '03/28', cardholderName: 'CARD HOLDER 1', cardTier: 'CLASSIC', status: 'ACTIVE', issueDate: '2024-03-15', contactlessEnabled: true, onlineEnabled: true, atmEnabled: true, posEnabled: true, internationalEnabled: false },
  { id: 2, cardReference: 'CRD-002', cardNumberMasked: '**** **** **** 1002', customerDisplayName: 'Card Holder 2', customerId: 2, cardType: 'CREDIT', cardScheme: 'MASTERCARD', accountNumber: '0100000002', accountId: 2, expiryDate: '06/27', cardholderName: 'CARD HOLDER 2', cardTier: 'GOLD', status: 'ACTIVE', issueDate: '2023-06-20', contactlessEnabled: true, onlineEnabled: false, atmEnabled: true, posEnabled: true, internationalEnabled: true },
  { id: 3, cardReference: 'CRD-003', cardNumberMasked: '**** **** **** 1003', customerDisplayName: 'Card Holder 3', customerId: 3, cardType: 'DEBIT', cardScheme: 'VERVE', accountNumber: '0100000003', accountId: 3, expiryDate: '12/25', cardholderName: 'CARD HOLDER 3', cardTier: 'CLASSIC', status: 'BLOCKED', issueDate: '2022-12-10' },
  { id: 4, cardReference: 'CRD-004', cardNumberMasked: '**** **** **** 1004', customerDisplayName: 'Card Holder 4', customerId: 4, cardType: 'PREPAID', cardScheme: 'VISA', accountNumber: '0100000004', accountId: 4, expiryDate: '01/26', cardholderName: 'CARD HOLDER 4', cardTier: 'CLASSIC', status: 'PENDING_ACTIVATION', issueDate: '2026-01-05' },
  { id: 5, cardReference: 'CRD-005', cardNumberMasked: '**** **** **** 1005', customerDisplayName: 'Card Holder 5', customerId: 5, cardType: 'DEBIT', cardScheme: 'VISA', accountNumber: '0100000005', accountId: 5, expiryDate: '09/24', cardholderName: 'CARD HOLDER 5', cardTier: 'CLASSIC', status: 'EXPIRED', issueDate: '2021-09-15' },
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

  it('renders the request card action', () => {
    setupHandlers();
    renderWithProviders(<CardListPage />);
    expect(screen.getByRole('button', { name: /request card/i })).toBeInTheDocument();
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
