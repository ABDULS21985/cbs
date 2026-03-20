import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CardDisputePage } from './CardDisputePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockDisputes = [
  {
    id: 1, disputeRef: 'DSP-001', cardId: 1, customerId: 101, accountId: 1,
    transactionId: 10, transactionRef: 'TXN010', transactionDate: '2024-03-10',
    transactionAmount: 50000, transactionCurrency: 'NGN',
    merchantName: 'Unknown Merchant', merchantId: 'M999',
    disputeType: 'FRAUD', disputeReason: 'Unrecognized transaction',
    disputeAmount: 50000, disputeCurrency: 'NGN',
    cardScheme: 'VISA', schemeCaseId: '', schemeReasonCode: '',
    filingDeadline: '2024-04-10', responseDeadline: '2024-04-20',
    arbitrationDeadline: '2024-05-10', isSlaBreached: false,
    provisionalCreditAmount: 0, provisionalCreditDate: '',
    provisionalCreditReversed: false, evidenceDocuments: [],
    merchantResponse: '', merchantResponseDate: '',
    resolutionType: '', resolutionAmount: 0, resolutionDate: '',
    resolutionNotes: '', status: 'OPEN', assignedTo: 'agent-1',
    createdAt: '2024-03-12T10:00:00Z', createdBy: 'customer',
    version: 0, timeline: [],
  },
  {
    id: 2, disputeRef: 'DSP-002', cardId: 2, customerId: 102, accountId: 2,
    transactionId: 20, transactionRef: 'TXN020', transactionDate: '2024-03-08',
    transactionAmount: 120000, transactionCurrency: 'NGN',
    merchantName: 'Fake Store', merchantId: 'M888',
    disputeType: 'UNAUTHORIZED', disputeReason: 'Card never used at this merchant',
    disputeAmount: 120000, disputeCurrency: 'NGN',
    cardScheme: 'MASTERCARD', schemeCaseId: '', schemeReasonCode: '',
    filingDeadline: '2024-04-08', responseDeadline: '2024-04-18',
    arbitrationDeadline: '2024-05-08', isSlaBreached: true,
    provisionalCreditAmount: 120000, provisionalCreditDate: '2024-03-09',
    provisionalCreditReversed: false, evidenceDocuments: [],
    merchantResponse: '', merchantResponseDate: '',
    resolutionType: '', resolutionAmount: 0, resolutionDate: '',
    resolutionNotes: '', status: 'INVESTIGATING', assignedTo: 'agent-2',
    createdAt: '2024-03-09T08:00:00Z', createdBy: 'customer',
    version: 1, timeline: [],
  },
];

function setupHandlers(disputes = mockDisputes) {
  server.use(
    http.get('/api/v1/cards/disputes/status/:status', () => HttpResponse.json(wrap(disputes))),
  );
}

describe('CardDisputePage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    expect(screen.getByText('Disputes & Chargebacks')).toBeInTheDocument();
  });

  it('renders status filter buttons', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('OPEN')).toBeInTheDocument();
    });
    expect(screen.getByText('INVESTIGATING')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
    expect(screen.getByText('ESCALATED')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('Open Disputes')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Disputed')).toBeInTheDocument();
    expect(screen.getByText('SLA Breached')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('renders dispute list data', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('DSP-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Unknown Merchant')).toBeInTheDocument();
    expect(screen.getByText('DSP-002')).toBeInTheDocument();
    expect(screen.getByText('Fake Store')).toBeInTheDocument();
  });

  it('displays SLA breach indicator', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('Breached')).toBeInTheDocument();
    });
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders empty state when no disputes', async () => {
    setupHandlers([]);
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('No disputes found for this status')).toBeInTheDocument();
    });
  });

  it('shows table column headers', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('Dispute Ref')).toBeInTheDocument();
    });
    expect(screen.getByText('Merchant')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('SLA')).toBeInTheDocument();
  });

  it('status filter changes on click', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('OPEN')).toBeInTheDocument();
    });
    // OPEN button should be active by default
    const openBtn = screen.getByText('OPEN');
    expect(openBtn.className).toContain('bg-primary');

    // Click INVESTIGATING
    fireEvent.click(screen.getByText('INVESTIGATING'));
    expect(screen.getByText('INVESTIGATING').className).toContain('bg-primary');
  });

  it('displays dispute reasons', async () => {
    setupHandlers();
    renderWithProviders(<CardDisputePage />);
    await waitFor(() => {
      expect(screen.getByText('Unrecognized transaction')).toBeInTheDocument();
    });
  });
});
