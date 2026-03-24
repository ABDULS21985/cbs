import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { QrPaymentPage } from './QrPaymentPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockTransactions = [
  {
    id: '1',
    qrRef: 'QR-001',
    date: '2026-03-15T10:00:00Z',
    payerName: 'John Doe',
    amount: 5000,
    currency: 'NGN',
    status: 'COMPLETED',
    settlement: '2026-03-15T12:00:00Z',
  },
  {
    id: '2',
    qrRef: 'QR-002',
    date: '2026-03-16T14:00:00Z',
    payerName: 'Jane Smith',
    amount: 3000,
    currency: 'NGN',
    status: 'PENDING',
    settlement: null,
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/payments/qr/transactions', () =>
      HttpResponse.json(wrap(mockTransactions)),
    ),
  );
}

describe('QrPaymentPage', () => {
  it('renders the page header with QR', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    expect(screen.getByText('QR Payments')).toBeInTheDocument();
  });

  it('renders QR generator section', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    // "Generate QR Code" appears as both section title and button
    expect(screen.getAllByText('Generate QR Code').length).toBeGreaterThanOrEqual(1);
  });

  it('shows transaction history section', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    expect(screen.getByText('QR Transaction History')).toBeInTheDocument();
  });

  it('renders QR payment analytics section', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    expect(screen.getByText('QR Payment Analytics')).toBeInTheDocument();
  });

  it('displays analytics data after loading', async () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Total QR Payments').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Total Received').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Active QR Code').length).toBeGreaterThan(0);
    });
  });

  it('shows No badge when no QR code is generated', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    expect(screen.getAllByText('No').length).toBeGreaterThan(0);
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    expect(screen.getByText(/generate qr codes/i)).toBeInTheDocument();
  });

  it('shows placeholder when no QR is generated', () => {
    setupHandlers();
    renderWithProviders(<QrPaymentPage />);
    expect(screen.getByText('No QR Code Generated')).toBeInTheDocument();
  });
});
