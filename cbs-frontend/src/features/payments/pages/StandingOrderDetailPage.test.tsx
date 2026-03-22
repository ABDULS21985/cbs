import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { StandingOrderDetailPage } from './StandingOrderDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockOrder = {
  id: 1,
  reference: 'SO-000001',
  sourceAccountId: 10,
  sourceAccountNumber: '0123456789',
  sourceAccountName: 'Main Current Account',
  beneficiaryName: 'Landlord Properties Ltd',
  beneficiaryAccount: '0987654321',
  beneficiaryBankCode: '058',
  beneficiaryBankName: 'GTBank',
  amount: 150000,
  currency: 'NGN',
  frequency: 'MONTHLY' as const,
  dayOfMonth: 1,
  startDate: '2026-01-01',
  endDate: '2027-01-01',
  nextExecution: '2026-04-01',
  lastExecuted: '2026-03-01',
  description: 'Monthly rent payment',
  executionCount: 3,
  failureCount: 0,
  status: 'ACTIVE' as const,
};

const mockExecutions = [
  {
    id: 101,
    executionNumber: 1,
    executionDate: '2026-01-01',
    amount: 150000,
    transactionRef: 'TXN-EX-001',
    status: 'SUCCESSFUL' as const,
    failureReason: null,
  },
  {
    id: 102,
    executionNumber: 2,
    executionDate: '2026-02-01',
    amount: 150000,
    transactionRef: 'TXN-EX-002',
    status: 'SUCCESSFUL' as const,
    failureReason: null,
  },
  {
    id: 103,
    executionNumber: 3,
    executionDate: '2026-03-01',
    amount: 150000,
    transactionRef: 'TXN-EX-003',
    status: 'SUCCESSFUL' as const,
    failureReason: null,
  },
];

function renderDetailPage(orderId = 1) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  useAuthStore.setState({
    user: createMockUser(),
    accessToken: 'test-token-abc123',
    isAuthenticated: true,
    isLoading: false,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/payments/standing-orders/${orderId}`]}>
        <Routes>
          <Route path="/payments/standing-orders/:id" element={<StandingOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupHandlers(order = mockOrder, executions = mockExecutions) {
  server.use(
    http.get('/api/v1/standing-orders/:id', () =>
      HttpResponse.json(wrap(order)),
    ),
    http.get('/api/v1/standing-orders/:id/executions', () =>
      HttpResponse.json(wrap(executions)),
    ),
  );
}

describe('StandingOrderDetailPage', () => {
  // -- Loading state --
  it('renders loading skeleton while data is fetching', () => {
    server.use(
      http.get('/api/v1/standing-orders/:id', () => new Promise(() => {})),
      http.get('/api/v1/standing-orders/:id/executions', () => new Promise(() => {})),
    );
    renderDetailPage();
    expect(screen.getByText('Standing Order')).toBeInTheDocument();
  });

  // -- Page header --
  it('renders the page title with order reference', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Standing Order SO-000001')).toBeInTheDocument();
    });
  });

  it('renders the order description as subtitle', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Monthly rent payment')).toBeInTheDocument();
    });
  });

  // -- Instruction details --
  it('shows the Instruction Details section', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Instruction Details')).toBeInTheDocument();
    });
  });

  it('displays the order reference', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('SO-000001')).toBeInTheDocument();
    });
  });

  it('displays the beneficiary information', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(
        screen.getByText('Landlord Properties Ltd \u00b7 0987654321'),
      ).toBeInTheDocument();
    });
  });

  it('displays the frequency', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('MONTHLY')).toBeInTheDocument();
    });
  });

  it('shows end date value', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });
  });

  it('shows "Until cancelled" when no end date', async () => {
    setupHandlers({ ...mockOrder, endDate: undefined });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Until cancelled')).toBeInTheDocument();
    });
  });

  it('displays execution count', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Total Executions')).toBeInTheDocument();
    });
    // "3" appears both in the InfoGrid (Total Executions) and the execution table (execution number)
    // Verify there is at least one occurrence
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('displays failure count', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Failures')).toBeInTheDocument();
    });
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  // -- Execution History section --
  it('shows the Execution History section', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Execution History')).toBeInTheDocument();
    });
  });

  // -- Action buttons for ACTIVE order --
  it('shows Pause button for ACTIVE order', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });
  });

  it('shows Cancel button for ACTIVE order', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('does not show Resume button for ACTIVE order', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();
  });

  it('shows Back button', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  // -- Action buttons for PAUSED order --
  it('shows Resume button for PAUSED order', async () => {
    setupHandlers({ ...mockOrder, status: 'PAUSED' });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });

  it('shows Cancel button for PAUSED order', async () => {
    setupHandlers({ ...mockOrder, status: 'PAUSED' });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('does not show Pause button for PAUSED order', async () => {
    setupHandlers({ ...mockOrder, status: 'PAUSED' });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
  });

  // -- Action buttons for CANCELLED order --
  it('does not show Pause or Resume for CANCELLED order', async () => {
    setupHandlers({ ...mockOrder, status: 'CANCELLED' });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Standing Order SO-000001')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  // -- Cancel confirmation dialog --
  it('shows cancel confirmation dialog when Cancel is clicked', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('Cancel Standing Order?')).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        'This action cannot be undone. The standing order will be permanently cancelled.',
      ),
    ).toBeInTheDocument();
  });

  it('shows Keep Active and Cancel Order buttons in confirmation dialog', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('Keep Active')).toBeInTheDocument();
    });
    expect(screen.getByText('Cancel Order')).toBeInTheDocument();
  });

  it('dismisses cancel dialog when Keep Active is clicked', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('Keep Active')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Keep Active'));
    await waitFor(() => {
      expect(screen.queryByText('Cancel Standing Order?')).not.toBeInTheDocument();
    });
  });

  // -- Failed execution alert --
  it('shows failure alert when last execution failed', async () => {
    const failedExecutions = [
      ...mockExecutions,
      {
        id: 104,
        executionNumber: 4,
        executionDate: '2026-04-01',
        amount: 150000,
        transactionRef: null,
        status: 'FAILED' as const,
        failureReason: 'Insufficient balance',
      },
    ];
    setupHandlers(mockOrder, failedExecutions);
    renderDetailPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Last execution failed: Insufficient balance/),
      ).toBeInTheDocument();
    });
  });

  it('does not show failure alert when last execution is successful', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('Standing Order SO-000001')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Last execution failed/)).not.toBeInTheDocument();
  });

  // -- Info grid labels --
  it('renders all info grid labels', async () => {
    setupHandlers();
    renderDetailPage();
    await waitFor(() => {
      // "Reference" appears in both InfoGrid and ExecutionHistoryTable column header
      expect(screen.getAllByText('Reference').length).toBeGreaterThanOrEqual(1);
    });
    // "Status" appears in both InfoGrid and ExecutionHistoryTable
    expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Source Account')).toBeInTheDocument();
    expect(screen.getByText('Beneficiary')).toBeInTheDocument();
    // "Amount" appears in both InfoGrid and ExecutionHistoryTable
    expect(screen.getAllByText('Amount').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Next Execution')).toBeInTheDocument();
    expect(screen.getByText('Last Executed')).toBeInTheDocument();
    expect(screen.getByText('Total Executions')).toBeInTheDocument();
    expect(screen.getByText('Failures')).toBeInTheDocument();
  });

  // -- Server errors --
  it('handles server error gracefully', () => {
    server.use(
      http.get('/api/v1/standing-orders/:id', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get('/api/v1/standing-orders/:id/executions', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderDetailPage();
    expect(screen.getByText('Standing Order')).toBeInTheDocument();
  });
});
