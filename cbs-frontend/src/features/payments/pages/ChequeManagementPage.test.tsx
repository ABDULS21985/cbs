import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { ChequeManagementPage } from './ChequeManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockBooks = [
  { id: 1, accountNumber: '0012345678', bookNumber: 'BK-001', leafFrom: 1, leafTo: 25, availableLeaves: 20, status: 'ACTIVE', requestedDate: '2026-01-15' },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/cheques/books', () => HttpResponse.json(wrap(mockBooks))),
    http.get('/api/v1/cheques/clearing-queue', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/cheques/stop-payments', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/cheques/returns', () => HttpResponse.json(wrap([]))),
  );
}

describe('ChequeManagementPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ChequeManagementPage />);
    expect(screen.getByText('Cheque Management')).toBeInTheDocument();
  });

  it('renders tabs', () => {
    setupHandlers();
    renderWithProviders(<ChequeManagementPage />);
    expect(screen.getByText('Cheque Books')).toBeInTheDocument();
    expect(screen.getByText('Clearing')).toBeInTheDocument();
    expect(screen.getByText('Stop Payments')).toBeInTheDocument();
    expect(screen.getByText('Returns')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<ChequeManagementPage />);
    expect(screen.getByText(/cheque books, clearing queue/i)).toBeInTheDocument();
  });

  it('renders issued cheques tab', () => {
    setupHandlers();
    renderWithProviders(<ChequeManagementPage />);
    expect(screen.getByText('Issued Cheques')).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    server.use(
      http.get('/api/v1/cheques/books', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cheques/clearing-queue', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cheques/stop-payments', () => HttpResponse.json(wrap([]))),
      http.get('/api/v1/cheques/returns', () => HttpResponse.json(wrap([]))),
    );
    renderWithProviders(<ChequeManagementPage />);
    await waitFor(() => {
      expect(screen.getByText(/no cheque/i)).toBeInTheDocument();
    });
  });
});
