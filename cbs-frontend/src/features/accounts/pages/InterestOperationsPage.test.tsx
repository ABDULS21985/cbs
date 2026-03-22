import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { InterestOperationsPage } from './InterestOperationsPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

describe('InterestOperationsPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders the page title and sections', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByText('Interest Operations')).toBeInTheDocument();
    expect(screen.getByText('Single Account Operations')).toBeInTheDocument();
    expect(screen.getByText('Batch Operations')).toBeInTheDocument();
  });

  it('shows account ID input field', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByPlaceholderText('Enter numeric account ID')).toBeInTheDocument();
  });

  it('shows Accrue Interest and Post Interest buttons', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByRole('button', { name: /Accrue Interest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Post Interest/i })).toBeInTheDocument();
  });

  it('shows Run Batch Accrual button', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByRole('button', { name: /Run Batch Accrual/i })).toBeInTheDocument();
  });

  it('disables single account buttons when account ID is empty', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByRole('button', { name: /Accrue Interest/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Post Interest/i })).toBeDisabled();
  });

  it('enables single account buttons when account ID is filled', () => {
    renderWithProviders(<InterestOperationsPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter numeric account ID'), {
      target: { value: '42' },
    });
    expect(screen.getByRole('button', { name: /Accrue Interest/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Post Interest/i })).toBeEnabled();
  });

  it('shows success banner after accruing interest', async () => {
    server.use(
      http.post('/api/v1/accounts/42/interest/accrue', () =>
        HttpResponse.json(wrap({ accruedAmount: 1234.56 })),
      ),
    );

    renderWithProviders(<InterestOperationsPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter numeric account ID'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Accrue Interest/i }));

    await waitFor(() => {
      expect(screen.getByText('Accrual')).toBeInTheDocument();
      expect(screen.getByText(/Interest accrued for account 42/)).toBeInTheDocument();
    });
  });

  it('shows success banner after posting interest', async () => {
    server.use(
      http.post('/api/v1/accounts/42/interest/post', () =>
        HttpResponse.json(wrap({ transactionRef: 'INT-POST-001' })),
      ),
    );

    renderWithProviders(<InterestOperationsPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter numeric account ID'), {
      target: { value: '42' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Post Interest/i }));

    await waitFor(() => {
      expect(screen.getByText('Posting')).toBeInTheDocument();
      expect(screen.getByText(/Interest posted for account 42/)).toBeInTheDocument();
    });
  });

  it('shows success banner after batch accrual', async () => {
    server.use(
      http.post('/api/v1/accounts/interest/batch-accrue', () =>
        HttpResponse.json(wrap({ accountsProcessed: 150 })),
      ),
    );

    renderWithProviders(<InterestOperationsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Run Batch Accrual/i }));

    await waitFor(() => {
      expect(screen.getByText('Batch Accrual')).toBeInTheDocument();
      expect(screen.getByText(/Batch interest accrual completed/)).toBeInTheDocument();
    });
  });

  it('shows error banner on accrual failure', async () => {
    server.use(
      http.post('/api/v1/accounts/99/interest/accrue', () =>
        HttpResponse.json(
          { success: false, message: 'Account not found' },
          { status: 404 },
        ),
      ),
    );

    renderWithProviders(<InterestOperationsPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter numeric account ID'), {
      target: { value: '99' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Accrue Interest/i }));

    await waitFor(() => {
      expect(screen.getByText('Accrual')).toBeInTheDocument();
    });
  });

  it('shows batch warning about processing time', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByText(/Batch accrual will process all active accounts/)).toBeInTheDocument();
  });

  it('shows help text about using numeric account ID', () => {
    renderWithProviders(<InterestOperationsPage />);
    expect(screen.getByText(/Use the numeric account ID, not the account number/)).toBeInTheDocument();
  });
});
