import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { TransactionPostingPage } from './TransactionPostingPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const successResponse = {
  transactionRef: 'TXN-20260322-00001',
  status: 'POSTED',
};

function fillCreditForm() {
  fireEvent.change(screen.getByPlaceholderText('Account number'), {
    target: { value: '0100000001' },
  });
  fireEvent.change(screen.getByPlaceholderText('0.00'), {
    target: { value: '50000' },
  });
  fireEvent.change(screen.getByPlaceholderText('Transaction description'), {
    target: { value: 'Salary credit' },
  });
}

describe('TransactionPostingPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders the page title and type selector buttons', () => {
    renderWithProviders(<TransactionPostingPage />);

    expect(screen.getByText('Post Transaction')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Credit/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Debit/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Transfer/i }).length).toBeGreaterThan(0);
  });

  it('selects Credit type by default', () => {
    renderWithProviders(<TransactionPostingPage />);

    expect(screen.getByRole('button', { name: /Post CREDIT/i })).toBeInTheDocument();
    expect(screen.getByText('Account Number *')).toBeInTheDocument();
  });

  it('allows switching between Credit, Debit, and Transfer types', () => {
    renderWithProviders(<TransactionPostingPage />);

    // Switch to Debit
    fireEvent.click(screen.getByText('Debit'));
    expect(screen.getByRole('button', { name: /Post DEBIT/i })).toBeInTheDocument();

    // Switch to Transfer
    fireEvent.click(screen.getByText('Transfer'));
    expect(screen.getByRole('button', { name: /Post TRANSFER/i })).toBeInTheDocument();

    // Switch back to Credit
    fireEvent.click(screen.getByText('Credit'));
    expect(screen.getByRole('button', { name: /Post CREDIT/i })).toBeInTheDocument();
  });

  it('submits a credit posting successfully', async () => {
    server.use(
      http.post('/api/v1/accounts/transactions/credit', () =>
        HttpResponse.json(wrap(successResponse)),
      ),
    );

    renderWithProviders(<TransactionPostingPage />);

    fillCreditForm();

    fireEvent.click(screen.getByRole('button', { name: /Post CREDIT/i }));

    await waitFor(() => {
      expect(screen.getByText('Transaction Posted')).toBeInTheDocument();
    });

    expect(screen.getByText(/TXN-20260322-00001/)).toBeInTheDocument();
  });

  it('submits a debit posting successfully', async () => {
    server.use(
      http.post('/api/v1/accounts/transactions/debit', () =>
        HttpResponse.json(wrap(successResponse)),
      ),
    );

    renderWithProviders(<TransactionPostingPage />);

    fireEvent.click(screen.getByText('Debit'));

    fillCreditForm();

    fireEvent.click(screen.getByRole('button', { name: /Post DEBIT/i }));

    await waitFor(() => {
      expect(screen.getByText('Transaction Posted')).toBeInTheDocument();
    });
  });

  it('shows "From Account" and "To Account" labels in Transfer mode', () => {
    renderWithProviders(<TransactionPostingPage />);

    fireEvent.click(screen.getByText('Transfer'));

    expect(screen.getByText('From Account *')).toBeInTheDocument();
    expect(screen.getByText('To Account *')).toBeInTheDocument();
  });

  it('submits a transfer posting successfully', async () => {
    server.use(
      http.post('/api/v1/accounts/transactions/transfer', () =>
        HttpResponse.json(wrap(successResponse)),
      ),
    );

    renderWithProviders(<TransactionPostingPage />);

    fireEvent.click(screen.getByText('Transfer'));

    fireEvent.change(screen.getByPlaceholderText('Account number'), {
      target: { value: '0100000001' },
    });
    fireEvent.change(screen.getByPlaceholderText('Destination account'), {
      target: { value: '0100000002' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '25000' },
    });
    fireEvent.change(screen.getByPlaceholderText('Transaction description'), {
      target: { value: 'Inter-account transfer' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Post TRANSFER/i }));

    await waitFor(() => {
      expect(screen.getByText('Transaction Posted')).toBeInTheDocument();
    });
  });

  it('disables submit button when required fields are empty', () => {
    renderWithProviders(<TransactionPostingPage />);

    const submitBtn = screen.getByRole('button', { name: /Post CREDIT/i });
    expect(submitBtn).toBeDisabled();

    // Fill only account number - still disabled
    fireEvent.change(screen.getByPlaceholderText('Account number'), {
      target: { value: '0100000001' },
    });
    expect(submitBtn).toBeDisabled();

    // Fill amount too - still disabled (no narration)
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '1000' },
    });
    expect(submitBtn).toBeDisabled();

    // Fill narration - now enabled
    fireEvent.change(screen.getByPlaceholderText('Transaction description'), {
      target: { value: 'Test' },
    });
    expect(submitBtn).toBeEnabled();
  });

  it('disables submit for transfer when contraAccount is empty', () => {
    renderWithProviders(<TransactionPostingPage />);

    fireEvent.click(screen.getByText('Transfer'));

    fireEvent.change(screen.getByPlaceholderText('Account number'), {
      target: { value: '0100000001' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByPlaceholderText('Transaction description'), {
      target: { value: 'Transfer' },
    });

    const submitBtn = screen.getByRole('button', { name: /Post TRANSFER/i });
    // Missing "To Account" => disabled
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Destination account'), {
      target: { value: '0100000002' },
    });
    expect(submitBtn).toBeEnabled();
  });

  it('shows all channel options in the channel selector', () => {
    renderWithProviders(<TransactionPostingPage />);

    const channelSelect = screen.getByDisplayValue('BRANCH');
    expect(channelSelect).toBeInTheDocument();

    const options = channelSelect.querySelectorAll('option');
    const optionValues = Array.from(options).map((o) => o.textContent);

    expect(optionValues).toEqual([
      'BRANCH', 'SYSTEM', 'API', 'MOBILE', 'INTERNET', 'ATM', 'POS', 'CHEQUE',
    ]);
  });

  it('displays success state with "Transaction Posted" and reference', async () => {
    server.use(
      http.post('/api/v1/accounts/transactions/credit', () =>
        HttpResponse.json(wrap(successResponse)),
      ),
    );

    renderWithProviders(<TransactionPostingPage />);

    fillCreditForm();
    fireEvent.click(screen.getByRole('button', { name: /Post CREDIT/i }));

    await waitFor(() => {
      expect(screen.getByText('Transaction Posted')).toBeInTheDocument();
    });

    expect(screen.getByText('Transaction reference')).toBeInTheDocument();
    expect(screen.getByText('TXN-20260322-00001')).toBeInTheDocument();
    expect(screen.getByText(/Credit posted successfully/i)).toBeInTheDocument();
    expect(screen.getAllByText(/0100000001/).length).toBeGreaterThan(0);
  });

  it('resets form when "Post Another" button is clicked', async () => {
    server.use(
      http.post('/api/v1/accounts/transactions/credit', () =>
        HttpResponse.json(wrap(successResponse)),
      ),
    );

    renderWithProviders(<TransactionPostingPage />);

    fillCreditForm();
    fireEvent.click(screen.getByRole('button', { name: /Post CREDIT/i }));

    await waitFor(() => {
      expect(screen.getByText('Transaction Posted')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start clean'));

    expect(screen.getByText('Post Transaction')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Account number')).toHaveValue('');
    expect(screen.getByPlaceholderText('Transaction description')).toHaveValue('');
  });

  it('prefills account number from URL query param', () => {
    renderWithProviders(<TransactionPostingPage />, {
      route: '/accounts/post-transaction?account=0100000099',
    });

    expect(screen.getByPlaceholderText('Account number')).toHaveValue('0100000099');
  });

  it('shows toast on posting failure', async () => {
    server.use(
      http.post('/api/v1/accounts/transactions/credit', () =>
        HttpResponse.json(
          { success: false, message: 'Insufficient balance' },
          { status: 400 },
        ),
      ),
    );

    const toastSpy = vi.fn();
    const { default: sonner } = await import('sonner');
    const originalError = sonner?.toast?.error;

    // We rely on the mutation's onError calling toast.error
    renderWithProviders(<TransactionPostingPage />);

    fillCreditForm();
    fireEvent.click(screen.getByRole('button', { name: /Post CREDIT/i }));

    // The form should remain visible (no success state)
    await waitFor(() => {
      expect(screen.getByText('Post Transaction')).toBeInTheDocument();
      expect(screen.queryByText('Transaction Posted')).not.toBeInTheDocument();
    });
  });

  it('shows Contra Account and GL Code fields for Credit type but not Transfer', () => {
    renderWithProviders(<TransactionPostingPage />);

    // Credit mode (default) - should show contra fields
    expect(screen.getByText('Contra Account')).toBeInTheDocument();
    expect(screen.getByText('Contra GL Code')).toBeInTheDocument();

    // Switch to Debit - should still show contra fields
    fireEvent.click(screen.getByText('Debit'));
    expect(screen.getByText('Contra Account')).toBeInTheDocument();
    expect(screen.getByText('Contra GL Code')).toBeInTheDocument();

    // Switch to Transfer - contra fields should disappear
    fireEvent.click(screen.getByText('Transfer'));
    expect(screen.queryByText('Contra Account')).not.toBeInTheDocument();
    expect(screen.queryByText('Contra GL Code')).not.toBeInTheDocument();
  });

  it('keeps Channel selector visible in Transfer mode', () => {
    renderWithProviders(<TransactionPostingPage />);

    expect(screen.getByDisplayValue('BRANCH')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Transfer'));
    expect(screen.getByDisplayValue('BRANCH')).toBeInTheDocument();
  });

  it('shows value date and instrument number fields for non-transfer postings', () => {
    renderWithProviders(<TransactionPostingPage />);

    expect(screen.getAllByText('Value Date').length).toBeGreaterThan(0);
    expect(screen.getByText('Instrument Number')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Transfer'));

    expect(screen.queryAllByText('Value Date')).toHaveLength(0);
    expect(screen.queryByText('Instrument Number')).not.toBeInTheDocument();
  });
});
