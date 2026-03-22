import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { MaAdvisoryPage } from '../pages/MaAdvisoryPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockEngagements = [
  {
    id: 1, engagementCode: 'MA-001', engagementName: 'Eagle Acquisition',
    engagementType: 'BUY_SIDE', clientName: 'ABC Corp', targetName: 'Target Ltd',
    transactionCurrency: 'USD', estimatedDealValue: 50000000, status: 'MANDATED',
    totalFeesEarned: 100000, ourRole: 'SOLE_ADVISER', leadBanker: 'John Smith',
    clientCustomerId: 1, clientSector: 'Finance', targetSector: 'Tech',
    targetCountry: 'USA', actualDealValue: 0, dealStructure: 'CASH',
    teamMembers: {}, retainerFee: 10000, retainerFrequency: 'MONTHLY',
    successFeePct: 0.02, successFeeMin: 50000, successFeeCap: 500000,
    expenseReimbursement: true, mandateDate: '2024-01-15',
    informationMemoDate: null, dataRoomOpenDate: null, indicativeBidDeadline: null,
    dueDiligenceStart: null, dueDiligenceEnd: null, bindingBidDeadline: null,
    signingDate: null, regulatoryApprovalDate: null, closingDate: null,
    competingBidders: 0, confidentialityAgreements: {}, regulatoryApprovals: {},
  },
  {
    id: 2, engagementCode: 'MA-002', engagementName: 'Lion Merger',
    engagementType: 'MERGER', clientName: 'XYZ Holdings', targetName: 'Omega Inc',
    transactionCurrency: 'EUR', estimatedDealValue: 120000000, status: 'CLOSED',
    totalFeesEarned: 2400000, ourRole: 'JOINT_ADVISER', leadBanker: 'Jane Doe',
    clientCustomerId: 2, clientSector: 'Energy', targetSector: 'Energy',
    targetCountry: 'GBR', actualDealValue: 115000000, dealStructure: 'MIXED',
    teamMembers: {}, retainerFee: 25000, retainerFrequency: 'QUARTERLY',
    successFeePct: 0.015, successFeeMin: 1000000, successFeeCap: 3000000,
    expenseReimbursement: true, mandateDate: '2023-06-01',
    informationMemoDate: '2023-07-01', dataRoomOpenDate: '2023-08-01',
    indicativeBidDeadline: '2023-09-01', dueDiligenceStart: '2023-09-15',
    dueDiligenceEnd: '2023-11-01', bindingBidDeadline: '2023-11-15',
    signingDate: '2023-12-01', regulatoryApprovalDate: '2024-01-15',
    closingDate: '2024-02-01',
    competingBidders: 3, confidentialityAgreements: {}, regulatoryApprovals: {},
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/ma-advisory', () => HttpResponse.json(wrap(mockEngagements))),
    http.get('/api/v1/ma-advisory/pipeline', () => HttpResponse.json(wrap({ MANDATED: 1, CLOSED: 1 }))),
    http.get('/api/v1/ma-advisory/revenue', () => HttpResponse.json(wrap(2500000))),
    http.post('/api/v1/ma-advisory', () => HttpResponse.json(wrap({
      ...mockEngagements[0], id: 3, engagementCode: 'MA-003',
    }))),
    http.patch('/api/v1/ma-advisory/:code/milestone', () => HttpResponse.json(wrap(mockEngagements[0]))),
    http.post('/api/v1/ma-advisory/:code/fee', () => HttpResponse.json(wrap({ ...mockEngagements[0], totalFeesEarned: 150000 }))),
    http.post('/api/v1/ma-advisory/:code/close', () => HttpResponse.json(wrap({ ...mockEngagements[0], status: 'CLOSED' }))),
    http.post('/api/v1/ma-advisory/:code/terminate', () => HttpResponse.json(wrap({ ...mockEngagements[0], status: 'TERMINATED' }))),
  );
}

describe('MaAdvisoryPage', () => {
  it('renders page header and new engagement button', () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    expect(screen.getByText('M&A Advisory')).toBeInTheDocument();
    expect(screen.getByText('New Engagement')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Active Mandates')).toBeInTheDocument();
    });
    expect(screen.getByText('Pipeline Value')).toBeInTheDocument();
    expect(screen.getByText('Revenue YTD')).toBeInTheDocument();
    expect(screen.getByText('Closed Deals')).toBeInTheDocument();
  });

  it('loads and displays engagements in table', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('MA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Eagle Acquisition')).toBeInTheDocument();
    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('Target Ltd')).toBeInTheDocument();
    expect(screen.getByText('MA-002')).toBeInTheDocument();
    expect(screen.getByText('Lion Merger')).toBeInTheDocument();
  });

  it('displays pipeline stage filters', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Pipeline by Stage')).toBeInTheDocument();
    });
  });

  it('filters by type and status', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('MA-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'CLOSED' } });

    await waitFor(() => {
      expect(screen.queryByText('MA-001')).not.toBeInTheDocument();
    });
    expect(screen.getByText('MA-002')).toBeInTheDocument();
  });

  it('opens create engagement dialog', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    fireEvent.click(screen.getByText('New Engagement'));
    await waitFor(() => {
      expect(screen.getByText('New M&A Engagement')).toBeInTheDocument();
    });
    expect(screen.getByText('Engagement Name *')).toBeInTheDocument();
    expect(screen.getByText('Create Engagement')).toBeInTheDocument();
  });

  it('shows row action menu with correct options', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('MA-001')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Update Milestone')).toBeInTheDocument();
    });
    expect(screen.getByText('Record Fee')).toBeInTheDocument();
    expect(screen.getByText('Close Engagement')).toBeInTheDocument();
    expect(screen.getByText('Terminate')).toBeInTheDocument();
  });

  it('disables actions for closed engagements', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('MA-002')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByTitle('Actions');
    fireEvent.click(actionButtons[1]);

    await waitFor(() => {
      const milestoneBtn = screen.getByText('Update Milestone').closest('button');
      expect(milestoneBtn).toBeDisabled();
    });
  });

  it('clear filters button works', async () => {
    setupHandlers();
    renderWithProviders(<MaAdvisoryPage />);
    await waitFor(() => {
      expect(screen.getByText('MA-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'CLOSED' } });

    await waitFor(() => {
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Clear filters'));

    await waitFor(() => {
      expect(screen.getByText('MA-001')).toBeInTheDocument();
    });
  });
});
