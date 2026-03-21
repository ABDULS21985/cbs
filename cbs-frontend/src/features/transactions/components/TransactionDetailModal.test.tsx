import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransactionDetailModal } from './TransactionDetailModal';

const { getTransaction, reverseTransaction, downloadReceipt } = vi.hoisted(() => ({
  getTransaction: vi.fn(),
  reverseTransaction: vi.fn(),
  downloadReceipt: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../api/transactionApi', () => ({
  transactionApi: {
    getTransaction,
    reverseTransaction,
    downloadReceipt,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const transaction = {
  id: 'txn-1',
  reference: 'TXN-001',
  type: 'TRANSFER',
  channel: 'WEB',
  status: 'COMPLETED',
  dateTime: '2026-03-20T10:15:00Z',
  valueDate: '2026-03-20',
  postingDate: '2026-03-20',
  fromAccount: '0123456789',
  fromAccountName: 'Alice Doe',
  toAccount: '9876543210',
  toAccountName: 'Bob Doe',
  debitAmount: 15000,
  creditAmount: 15000,
  fee: 100,
  narration: 'Vendor payment',
  description: 'Vendor payment',
};

describe('TransactionDetailModal', () => {
  beforeEach(() => {
    getTransaction.mockResolvedValue(transaction);
    reverseTransaction.mockResolvedValue({ message: 'ok' });
    downloadReceipt.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resets reversal state after the modal closes and reopens', async () => {
    const wrapper = createWrapper();
    const { rerender } = render(
      <TransactionDetailModal transaction={transaction} open={true} onClose={vi.fn()} />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: /reverse transaction/i }));
    expect(await screen.findByText('Enhanced Reversal Workflow')).toBeInTheDocument();

    rerender(<TransactionDetailModal transaction={transaction} open={false} onClose={vi.fn()} />);
    rerender(<TransactionDetailModal transaction={transaction} open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('Enhanced Reversal Workflow')).not.toBeInTheDocument();
    });
  });

  it('shows a retryable warning banner when full transaction details fail to load', async () => {
    getTransaction.mockRejectedValueOnce(new Error('network'));
    const wrapper = createWrapper();

    render(
      <TransactionDetailModal transaction={transaction} open={true} onClose={vi.fn()} />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(getTransaction).toHaveBeenCalledTimes(2);
    });
  });
});
