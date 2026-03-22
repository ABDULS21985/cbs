import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardDisputeDetailPage } from './CardDisputeDetailPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockDispute = {
  id: 1,
  disputeRef: 'DSP-001',
  cardId: 10,
  customerId: 100,
  accountId: 200,
  transactionId: 50,
  transactionRef: 'TXN-050',
  transactionDate: '2026-01-10',
  transactionAmount: 75000,
  transactionCurrency: 'NGN',
  merchantName: 'Test Merchant',
  merchantId: 'M-001',
  disputeType: 'FRAUD',
  disputeReason: 'Unrecognised charge',
  disputeAmount: 75000,
  disputeCurrency: 'NGN',
  cardScheme: 'VISA',
  schemeCaseId: '',
  schemeReasonCode: '',
  filingDeadline: '2027-02-10',
  responseDeadline: '2027-02-20',
  arbitrationDeadline: '2027-03-10',
  isSlaBreached: false,
  provisionalCreditAmount: 0,
  provisionalCreditDate: null,
  provisionalCreditReversed: false,
  evidenceDocuments: [],
  merchantResponse: '',
  merchantResponseDate: null,
  resolutionType: '',
  resolutionAmount: 0,
  resolutionDate: null,
  resolutionNotes: '',
  status: 'INVESTIGATION',
  assignedTo: 'agent-1',
  createdAt: '2026-01-12T10:00:00Z',
  createdBy: 'customer',
  version: 0,
  timeline: [],
};

function renderDisputeDetail(disputeId = '1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });
  useAuthStore.setState({
    user: createMockUser(),
    accessToken: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/cards/disputes/${disputeId}`]}>
        <Routes>
          <Route path="/cards/disputes/:disputeId" element={<CardDisputeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setupHandlers(dispute = mockDispute) {
  server.use(
    http.get('/api/v1/cards/disputes/:id', () => HttpResponse.json(wrap(dispute))),
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('CardDisputeDetailPage', () => {
  it('renders dispute ref in page header', async () => {
    setupHandlers();
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getAllByText('DSP-001').length).toBeGreaterThan(0);
    });
  });

  it('renders dispute information fields', async () => {
    setupHandlers();
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getByText('Test Merchant')).toBeInTheDocument();
    });
    expect(screen.getByText('TXN-050')).toBeInTheDocument();
    expect(screen.getByText('VISA')).toBeInTheDocument();
  });

  it('shows provisional credit button when no credit has been issued', async () => {
    setupHandlers();
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getByText('Issue Provisional Credit')).toBeInTheDocument();
    });
  });

  it('hides provisional credit button when credit already issued', async () => {
    setupHandlers({ ...mockDispute, provisionalCreditAmount: 75000 });
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getAllByText('DSP-001').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Issue Provisional Credit')).not.toBeInTheDocument();
  });

  it('calls provisional credit endpoint when button is clicked', async () => {
    let capturedId: string | undefined;
    server.use(
      http.get('/api/v1/cards/disputes/:id', () => HttpResponse.json(wrap(mockDispute))),
      http.post('/api/v1/cards/disputes/:id/provisional-credit', ({ params }) => {
        capturedId = params.id as string;
        return HttpResponse.json(wrap({ ...mockDispute, provisionalCreditAmount: 75000 }));
      }),
    );
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getByText('Issue Provisional Credit')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Issue Provisional Credit'));
    await waitFor(() => {
      expect(capturedId).toBe('1');
    });
  });

  it('shows File Chargeback button for INVESTIGATION status', async () => {
    setupHandlers();
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getByText('File Chargeback')).toBeInTheDocument();
    });
  });

  it('opens chargeback dialog on button click', async () => {
    setupHandlers();
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getByText('File Chargeback')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('File Chargeback'));
    await waitFor(() => {
      expect(screen.getByText('Scheme Case ID *')).toBeInTheDocument();
    });
  });

  it('sends schemeCaseId and schemeReasonCode as query params when filing chargeback', async () => {
    const captured: { id: string; schemeCaseId: string | null; schemeReasonCode: string | null }[] = [];
    server.use(
      http.get('/api/v1/cards/disputes/:id', () => HttpResponse.json(wrap(mockDispute))),
      http.post('/api/v1/cards/disputes/:id/chargeback', ({ params, request }) => {
        const url = new URL(request.url);
        captured.push({
          id: params.id as string,
          schemeCaseId: url.searchParams.get('schemeCaseId'),
          schemeReasonCode: url.searchParams.get('schemeReasonCode'),
        });
        return HttpResponse.json(wrap({ ...mockDispute, status: 'CHARGEBACK_FILED' }));
      }),
    );
    const user = userEvent.setup();
    renderDisputeDetail();

    await waitFor(() => expect(screen.getByText('File Chargeback')).toBeInTheDocument());
    await user.click(screen.getByText('File Chargeback'));
    await waitFor(() => expect(screen.getByText('Scheme Case ID *')).toBeInTheDocument());

    const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
    // Find inputs inside the dialog: schemeCaseId and schemeReasonCode
    const dialogInputs = Array.from(inputs).filter(
      (el) => (el as HTMLInputElement).placeholder?.includes('VISA-CB') || (el as HTMLInputElement).placeholder?.includes('10.4'),
    ) as HTMLInputElement[];
    expect(dialogInputs.length).toBe(2);

    await user.clear(dialogInputs[0]);
    await user.type(dialogInputs[0], 'VISA-CB-2026-001');
    await user.clear(dialogInputs[1]);
    await user.type(dialogInputs[1], '10.4');

    await user.click(screen.getByText('File'));
    await waitFor(() => expect(captured.length).toBeGreaterThan(0));

    expect(captured[0].id).toBe('1');
    expect(captured[0].schemeCaseId).toBe('VISA-CB-2026-001');
    expect(captured[0].schemeReasonCode).toBe('10.4');
  });

  it('sends merchantResponse as query param (not body) when submitting representment', async () => {
    const disputeInChargeback = { ...mockDispute, status: 'CHARGEBACK_FILED' as const };
    const captured: { merchantResponse: string | null }[] = [];
    server.use(
      http.get('/api/v1/cards/disputes/:id', () => HttpResponse.json(wrap(disputeInChargeback))),
      http.post('/api/v1/cards/disputes/:id/representment', ({ request }) => {
        const url = new URL(request.url);
        captured.push({ merchantResponse: url.searchParams.get('merchantResponse') });
        return HttpResponse.json(wrap({ ...disputeInChargeback, status: 'REPRESENTMENT' }));
      }),
    );
    const user = userEvent.setup();
    renderDisputeDetail();

    await waitFor(() => expect(screen.getByText('Submit Representment')).toBeInTheDocument());
    await user.click(screen.getByText('Submit Representment'));
    await waitFor(() => expect(screen.getByText('Merchant Response *')).toBeInTheDocument());

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'Merchant has evidence');

    await user.click(screen.getByText('Submit'));
    await waitFor(() => expect(captured.length).toBeGreaterThan(0));

    expect(captured[0].merchantResponse).toBe('Merchant has evidence');
  });

  it('sends resolutionType and resolutionAmount as query params when resolving dispute', async () => {
    const captured: {
      resolutionType: string | null;
      resolutionAmount: string | null;
    }[] = [];
    server.use(
      http.get('/api/v1/cards/disputes/:id', () => HttpResponse.json(wrap(mockDispute))),
      http.post('/api/v1/cards/disputes/:id/resolve', ({ request }) => {
        const url = new URL(request.url);
        captured.push({
          resolutionType: url.searchParams.get('resolutionType'),
          resolutionAmount: url.searchParams.get('resolutionAmount'),
        });
        return HttpResponse.json(wrap({ ...mockDispute, status: 'RESOLVED_CUSTOMER' }));
      }),
    );
    const user = userEvent.setup();
    renderDisputeDetail();

    await waitFor(() => expect(screen.getByText('Resolve')).toBeInTheDocument());
    // Click the "Resolve" action button (the one outside any dialog)
    const resolveButtons = screen.getAllByText('Resolve');
    await user.click(resolveButtons[0]);
    await waitFor(() => expect(screen.getByText('Resolve Dispute')).toBeInTheDocument());

    // Now the dialog's submit button has text "Resolve" — click the last one
    const allResolveButtons = screen.getAllByText('Resolve');
    await user.click(allResolveButtons[allResolveButtons.length - 1]);
    await waitFor(() => expect(captured.length).toBeGreaterThan(0));

    expect(captured[0].resolutionType).toBe('CUSTOMER_FAVOR');
    expect(captured[0].resolutionAmount).not.toBeNull();
  });

  it('shows no action buttons for terminal (resolved) disputes', async () => {
    setupHandlers({ ...mockDispute, status: 'RESOLVED_CUSTOMER' as unknown as typeof mockDispute.status });
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getAllByText('DSP-001').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('File Chargeback')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
  });

  it('shows error state when dispute ID is 0 (query disabled → no data)', () => {
    // id=0 → enabled: false in useCardDispute → data is undefined → error state renders
    renderDisputeDetail('0');
    expect(screen.getByText('Dispute Not Found')).toBeInTheDocument();
  });

  it('renders SLA deadline cards', async () => {
    setupHandlers();
    renderDisputeDetail();
    await waitFor(() => {
      expect(screen.getByText('Filing Deadline')).toBeInTheDocument();
    });
    expect(screen.getByText('Response Deadline')).toBeInTheDocument();
    expect(screen.getByText('Arbitration Deadline')).toBeInTheDocument();
  });
});
