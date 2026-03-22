import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AdvisoryDashboardPage } from '../pages/AdvisoryDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockMaMandates = [
  {
    id: 1, engagementCode: 'MA-001', engagementName: 'Eagle Acquisition',
    engagementType: 'BUY_SIDE', clientName: 'ABC Corp', targetName: 'Target Ltd',
    transactionCurrency: 'USD', estimatedDealValue: 50000000, status: 'MANDATED',
    totalFeesEarned: 100000, ourRole: 'SOLE_ADVISER', leadBanker: 'John',
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
];

const mockTaxEngagements = [
  {
    id: 1, engagementCode: 'TA-001', engagementName: 'Transfer Pricing Review',
    engagementType: 'TRANSFER_PRICING', clientName: 'XYZ Ltd',
    advisoryFee: 25000, status: 'IN_PROGRESS', riskRating: 'MEDIUM',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/ma-advisory/active', () => HttpResponse.json(wrap(mockMaMandates))),
    http.get('/api/v1/ma-advisory/workload', () => HttpResponse.json(wrap({ John: 3, Jane: 2 }))),
    http.get('/api/v1/ma-advisory/revenue', () => HttpResponse.json(wrap(500000))),
    http.get('/api/v1/ma-advisory/pipeline', () => HttpResponse.json(wrap({ MANDATED: 3, DUE_DILIGENCE: 2 }))),
    http.get('/api/v1/corporate-finance/active', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/project-finance', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/tax-advisory/active', () => HttpResponse.json(wrap(mockTaxEngagements))),
  );
}

describe('AdvisoryDashboardPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    expect(screen.getByText('Advisory Services')).toBeInTheDocument();
  });

  it('renders stat cards with computed values', async () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Active Mandates')).toBeInTheDocument();
    });
    expect(screen.getByText('M&A Pipeline Value')).toBeInTheDocument();
    expect(screen.getByText('M&A Revenue YTD')).toBeInTheDocument();
    expect(screen.getByText('Active Bankers')).toBeInTheDocument();
  });

  it('renders tab navigation for all advisory categories', async () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('M&A Advisory')).toBeInTheDocument();
    });
    expect(screen.getByText('Tax Advisory')).toBeInTheDocument();
    expect(screen.getByText('Corporate Finance')).toBeInTheDocument();
    expect(screen.getByText('Project Finance')).toBeInTheDocument();
  });

  it('shows M&A mandates data in table', async () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('MA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('Target Ltd')).toBeInTheDocument();
  });

  it('renders pipeline chart when data available', async () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('M&A Pipeline by Stage')).toBeInTheDocument();
    });
  });

  it('shows workload entries under M&A tab', async () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Lead Banker Workload')).toBeInTheDocument();
    });
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText(/3 active engagement/)).toBeInTheDocument();
  });

  it('renders navigation links to sub-pages', async () => {
    setupHandlers();
    renderWithProviders(<AdvisoryDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Manage all M&A engagements/)).toBeInTheDocument();
    });
  });
});
