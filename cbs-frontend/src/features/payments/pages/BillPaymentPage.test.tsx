import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { BillPaymentPage } from './BillPaymentPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCategories = [
  { code: 'electricity', name: 'Electricity', icon: 'zap', billerCount: 5 },
  { code: 'cable_tv', name: 'Cable TV', icon: 'tv', billerCount: 3 },
  { code: 'airtime', name: 'Airtime', icon: 'phone', billerCount: 4 },
];

const mockBillers = [
  { id: 1, name: 'IKEDC', code: 'IKEDC-01', category: 'electricity' },
  { id: 2, name: 'EKEDC', code: 'EKEDC-01', category: 'electricity' },
];

const mockFavorites = [
  { id: 1, alias: 'My Electricity', billerName: 'IKEDC', lastPaidAmount: 15000 },
];

function setupHandlers(categories = mockCategories, billers = mockBillers, favorites = mockFavorites) {
  server.use(
    http.get('/api/v1/bills/categories', () => HttpResponse.json(wrap(categories))),
    http.get('/api/v1/bills/billers', () => HttpResponse.json(wrap(billers))),
    http.get('/api/v1/bills/favorites', () => HttpResponse.json(wrap(favorites))),
    http.post('/api/v1/bills/pay', () =>
      HttpResponse.json(wrap({
        id: 1, transactionRef: 'BILL-123', billerName: 'IKEDC', amount: 15000, token: '1234-5678-9012', paidAt: new Date().toISOString(),
      }))
    ),
  );
}

describe('BillPaymentPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    expect(screen.getByText('Bill Payments')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    expect(screen.getByText(/pay bills and purchase airtime/i)).toBeInTheDocument();
  });

  it('renders category grid after loading', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });
    expect(screen.getByText('Cable TV')).toBeInTheDocument();
    expect(screen.getByText('Airtime')).toBeInTheDocument();
  });

  it('renders favorites section when favorites exist', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });
  });

  it('renders favorite item with alias', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('My Electricity')).toBeInTheDocument();
    });
  });

  it('does not render favorites section when favorites are empty', async () => {
    setupHandlers(mockCategories, mockBillers, []);
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
  });

  it('navigates to biller selection on category click', async () => {
    setupHandlers();
    
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Electricity'));
    await waitFor(() => {
      expect(screen.getByText('Back to categories')).toBeInTheDocument();
    });
  });

  it('shows selected category name in biller step', async () => {
    setupHandlers();
    
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Electricity'));
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });
  });

  it('can go back to categories from biller selection', async () => {
    setupHandlers();
    
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Electricity'));
    await waitFor(() => {
      expect(screen.getByText('Back to categories')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Back to categories'));
    await waitFor(() => {
      expect(screen.getByText('Cable TV')).toBeInTheDocument();
    });
  });

  it('shows empty categories grid when no categories', async () => {
    setupHandlers([], [], []);
    renderWithProviders(<BillPaymentPage />);
    expect(screen.getByText('Bill Payments')).toBeInTheDocument();
  });

  it('handles server error for categories', async () => {
    server.use(
      http.get('/api/v1/bills/categories', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/bills/favorites', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<BillPaymentPage />);
    expect(screen.getByText('Bill Payments')).toBeInTheDocument();
  });

  it('handles server error for favorites', async () => {
    server.use(
      http.get('/api/v1/bills/favorites', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<BillPaymentPage />);
    expect(screen.getByText('Bill Payments')).toBeInTheDocument();
  });

  it('renders all three categories', async () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    await waitFor(() => {
      expect(screen.getByText('Electricity')).toBeInTheDocument();
      expect(screen.getByText('Cable TV')).toBeInTheDocument();
      expect(screen.getByText('Airtime')).toBeInTheDocument();
    });
  });

  it('starts on category step', () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    // No "Back to categories" or receipt elements
    expect(screen.queryByText('Back to categories')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Successful')).not.toBeInTheDocument();
  });

  it('does not show receipt on initial load', () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    expect(screen.queryByText('Payment Receipt')).not.toBeInTheDocument();
  });

  it('does not show Make Another Payment on initial load', () => {
    setupHandlers();
    renderWithProviders(<BillPaymentPage />);
    expect(screen.queryByText('Make Another Payment')).not.toBeInTheDocument();
  });
});
