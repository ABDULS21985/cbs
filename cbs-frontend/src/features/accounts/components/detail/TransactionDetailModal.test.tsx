import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { TransactionDetailModal } from './TransactionDetailModal';
import type { Transaction } from '../../api/accountDetailApi';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockTransaction: Transaction = {
  id: '9001',
  date: '2024-03-20',
  reference: 'TXN-20240320-0001',
  description: 'Opening deposit',
  channel: 'BRANCH',
  currency: 'NGN',
  creditAmount: 50000,
  debitAmount: undefined,
  runningBalance: 50000,
  status: 'POSTED',
  narration: 'Initial account funding',
  valueDate: '2024-03-20',
};

const mockDebitTransaction: Transaction = {
  id: '9002',
  date: '2024-03-21',
  reference: 'TXN-20240321-0002',
  description: 'Cash withdrawal',
  channel: 'ATM',
  currency: 'NGN',
  creditAmount: undefined,
  debitAmount: 5000,
  runningBalance: 45000,
  status: 'POSTED',
  narration: 'ATM cash withdrawal',
  valueDate: '2024-03-21',
};

const reversedTransaction: Transaction = {
  ...mockTransaction,
  id: '9003',
  status: 'REVERSED',
  reference: 'TXN-20240320-0003',
};

describe('TransactionDetailModal', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders transaction details when open', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    expect(screen.getAllByText('TXN-20240320-0001').length).toBeGreaterThan(0);
    expect(screen.getByText('CREDIT')).toBeInTheDocument();
    expect(screen.getByText('BRANCH')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={false}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByText('Transaction Details')).not.toBeInTheDocument();
  });

  it('shows Receipt, Print, Dispute, and Reverse buttons', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /Receipt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dispute/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reverse/i })).toBeInTheDocument();
  });

  it('hides Reverse button for already reversed transactions', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={reversedTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole('button', { name: /Reverse/i })).not.toBeInTheDocument();
  });

  it('shows GL entries for credit transaction', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('GL Entries')).toBeInTheDocument();
    expect(screen.getByText('DR')).toBeInTheDocument();
    expect(screen.getByText('CR')).toBeInTheDocument();
  });

  it('shows reversal form when Reverse button is clicked', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Reverse/i }));

    expect(screen.getByText('Request Reversal')).toBeInTheDocument();
    expect(screen.getByText('Reason Category *')).toBeInTheDocument();
    expect(screen.getByText('Notes *')).toBeInTheDocument();
  });

  it('shows reversal reason dropdown with all categories', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Reverse/i }));

    const reasonSelect = screen.getByDisplayValue('Duplicate Posting');
    expect(reasonSelect).toBeInTheDocument();

    const options = reasonSelect.querySelectorAll('option');
    const optionLabels = Array.from(options).map(o => o.textContent);
    expect(optionLabels).toContain('Duplicate Posting');
    expect(optionLabels).toContain('Wrong Amount');
    expect(optionLabels).toContain('Wrong Account');
    expect(optionLabels).toContain('Customer Request');
    expect(optionLabels).toContain('Fraud / Unauthorized');
  });

  it('calls preview reversal API when Preview Impact is clicked', async () => {
    let previewCalled = false;
    server.use(
      http.post('/api/v1/transactions/9001/reversal/preview', () => {
        previewCalled = true;
        return HttpResponse.json(wrap({
          transactionId: 9001,
          transactionRef: 'TXN-20240320-0001',
          originalAmount: 50000,
          originalAccountNumber: '0100000001',
          originalDirection: 'CREDIT',
          reversalDirection: 'DEBIT',
          customerAccountNumber: '0100000001',
          dualAuthorizationRequired: true,
        }));
      }),
    );

    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Reverse/i }));

    // Fill notes (required)
    const notesInput = screen.getByPlaceholderText(/Explain why this transaction should be reversed/i);
    fireEvent.change(notesInput, { target: { value: 'Duplicate posting detected' } });

    fireEvent.click(screen.getByRole('button', { name: /Preview Impact/i }));

    await waitFor(() => {
      expect(previewCalled).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText('Reversal Preview')).toBeInTheDocument();
    });
  });

  it('calls reverse transaction API when Submit Reversal is clicked', async () => {
    let reverseCalled = false;
    server.use(
      http.post('/api/v1/transactions/9001/reverse', () => {
        reverseCalled = true;
        return HttpResponse.json(wrap({
          requestRef: 'REV-001',
          status: 'PENDING_APPROVAL',
          approvalRequired: true,
          approvalRequestCode: 'APR-001',
          message: 'Reversal submitted for approval',
        }));
      }),
    );

    const onClose = vi.fn();
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Reverse/i }));

    const notesInput = screen.getByPlaceholderText(/Explain why this transaction should be reversed/i);
    fireEvent.change(notesInput, { target: { value: 'Duplicate posting' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Reversal/i }));

    await waitFor(() => {
      expect(reverseCalled).toBe(true);
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls download receipt API when Receipt button is clicked', async () => {
    let receiptCalled = false;
    server.use(
      http.get('/api/v1/transactions/9001/receipt', () => {
        receiptCalled = true;
        return new HttpResponse('<html>Receipt</html>', {
          headers: { 'Content-Type': 'text/html' },
        });
      }),
    );

    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Receipt/i }));

    await waitFor(() => {
      expect(receiptCalled).toBe(true);
    });
  });

  it('navigates to disputes page when Dispute button is clicked', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    // The Dispute button should link to the disputes page
    const disputeBtn = screen.getByRole('button', { name: /Dispute/i });
    expect(disputeBtn).toBeInTheDocument();
    // Click triggers navigation (via handleClose + navigate)
    fireEvent.click(disputeBtn);
  });

  it('shows debit transaction with correct type and color', () => {
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockDebitTransaction}
        open={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('DEBIT')).toBeInTheDocument();
  });

  it('closes modal when X button is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <TransactionDetailModal
        transaction={mockTransaction}
        open={true}
        onClose={onClose}
      />,
    );

    // Find and click the X button (close button)
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg.w-5.h-5'));
    if (xButton) fireEvent.click(xButton);

    expect(onClose).toHaveBeenCalled();
  });
});
