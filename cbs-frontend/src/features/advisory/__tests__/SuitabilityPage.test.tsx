import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { SuitabilityPage } from '../pages/SuitabilityPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockProfiles = [
  {
    id: 1, profileCode: 'SP-001', customerId: 101, profileDate: '2025-01-15',
    investmentObjective: 'GROWTH', riskTolerance: 'AGGRESSIVE',
    investmentHorizon: 'LONG_TERM', annualIncome: 500000, netWorth: 5000000,
    liquidNetWorth: 2000000, investmentExperience: 'EXTENSIVE',
    knowledgeAssessmentScore: 85, maxSingleInvestmentPct: 20,
    derivativesApproved: true, leverageApproved: true,
    assessedBy: 'Officer-1', nextReviewDate: '2026-01-15',
    regulatoryBasis: 'MIFID_II', status: 'ACTIVE',
  },
  {
    id: 2, profileCode: 'SP-002', customerId: 102, profileDate: '2024-06-01',
    investmentObjective: 'INCOME', riskTolerance: 'CONSERVATIVE',
    investmentHorizon: 'SHORT_TERM', annualIncome: 200000, netWorth: 1000000,
    liquidNetWorth: 500000, investmentExperience: 'LIMITED',
    knowledgeAssessmentScore: 40, maxSingleInvestmentPct: 10,
    derivativesApproved: false, leverageApproved: false,
    assessedBy: 'Officer-2', nextReviewDate: '2025-01-01',
    regulatoryBasis: 'CBN_GUIDELINE', status: 'EXPIRED',
  },
];

const mockChecks = [
  {
    id: 1, checkRef: 'SC-001', customerId: 101, profileId: 1,
    checkType: 'PRE_TRADE', instrumentType: 'EQUITY', instrumentCode: 'DANGCEM',
    instrumentRiskRating: 'MEDIUM_RISK', proposedAmount: 500000,
    proposedPctOfPortfolio: 10, proposedPctOfNetWorth: 10,
    riskToleranceMatch: true, experienceMatch: true, concentrationCheck: true,
    liquidityCheck: true, knowledgeCheck: true, leverageCheck: true,
    overallResult: 'SUITABLE', warningMessages: null, rejectionReasons: null,
    overrideApplied: false, overrideJustification: null, overrideApprovedBy: null,
    regulatoryDisclosure: 'Standard disclosure', clientAcknowledged: true,
    clientAcknowledgedAt: '2025-03-20T10:00:00Z',
    checkedAt: '2025-03-20T09:00:00Z', createdBy: 'Officer-1',
  },
  {
    id: 2, checkRef: 'SC-002', customerId: 102, profileId: 2,
    checkType: 'PRE_TRADE', instrumentType: 'DERIVATIVE', instrumentCode: 'OPT-AAPL',
    instrumentRiskRating: 'VERY_HIGH_RISK', proposedAmount: 200000,
    proposedPctOfPortfolio: 40, proposedPctOfNetWorth: 20,
    riskToleranceMatch: false, experienceMatch: false, concentrationCheck: false,
    liquidityCheck: true, knowledgeCheck: false, leverageCheck: false,
    overallResult: 'UNSUITABLE', warningMessages: 'Client lacks derivatives experience',
    rejectionReasons: 'Risk tolerance and experience mismatch',
    overrideApplied: false, overrideJustification: null, overrideApprovedBy: null,
    regulatoryDisclosure: 'Enhanced risk disclosure required',
    clientAcknowledged: false, clientAcknowledgedAt: null,
    checkedAt: '2025-03-21T14:00:00Z', createdBy: 'Officer-2',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/suitability/profiles', () => HttpResponse.json(wrap(mockProfiles))),
    http.get('/api/v1/suitability/profiles/expired', () => HttpResponse.json(wrap([mockProfiles[1]]))),
    http.get('/api/v1/suitability/checks', () => HttpResponse.json(wrap(mockChecks))),
    http.post('/api/v1/suitability/profiles', () => HttpResponse.json(wrap({
      ...mockProfiles[0], id: 3, profileCode: 'SP-003',
    }))),
    http.post('/api/v1/suitability/checks', () => HttpResponse.json(wrap({
      ...mockChecks[0], id: 3, checkRef: 'SC-003',
    }))),
    http.post('/api/v1/suitability/checks/:ref/override', () => HttpResponse.json(wrap({
      ...mockChecks[1], overrideApplied: true, overrideJustification: 'Client insists',
    }))),
    http.post('/api/v1/suitability/checks/:ref/acknowledge', () => HttpResponse.json(wrap({
      ...mockChecks[1], clientAcknowledged: true,
    }))),
  );
}

describe('SuitabilityPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    expect(screen.getByText('Suitability Assessment')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Profiles')).toBeInTheDocument();
    });
    expect(screen.getByText('Expired Profiles')).toBeInTheDocument();
    expect(screen.getByText('Total Checks')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    expect(screen.getByText('New Assessment')).toBeInTheDocument();
    expect(screen.getByText('Perform Check')).toBeInTheDocument();
  });

  it('loads and displays checks in table', async () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    await waitFor(() => {
      expect(screen.getByText('SC-001')).toBeInTheDocument();
    });
    expect(screen.getByText('SC-002')).toBeInTheDocument();
    expect(screen.getByText('SUITABLE')).toBeInTheDocument();
    expect(screen.getByText('UNSUITABLE')).toBeInTheDocument();
  });

  it('shows expired profiles section', async () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    await waitFor(() => {
      expect(screen.getByText('Expired / Overdue Profiles')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Customer #102')).toBeInTheDocument();
    });
  });

  it('opens new assessment dialog', async () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    fireEvent.click(screen.getByText('New Assessment'));
    await waitFor(() => {
      expect(screen.getByText('New Suitability Assessment')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer ID *')).toBeInTheDocument();
    expect(screen.getByText('Investment Objective *')).toBeInTheDocument();
    expect(screen.getByText('Risk Tolerance *')).toBeInTheDocument();
  });

  it('opens perform check dialog', async () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    fireEvent.click(screen.getByText('Perform Check'));
    await waitFor(() => {
      expect(screen.getByText('Perform Suitability Check')).toBeInTheDocument();
    });
    expect(screen.getByText('Profile ID *')).toBeInTheDocument();
    expect(screen.getByText('Instrument Type *')).toBeInTheDocument();
    expect(screen.getByText('Run Check')).toBeInTheDocument();
  });

  it('shows acknowledge and override action buttons on check rows', async () => {
    setupHandlers();
    renderWithProviders(<SuitabilityPage />);
    await waitFor(() => {
      expect(screen.getByText('SC-002')).toBeInTheDocument();
    });
    // SC-002 is UNSUITABLE and not acknowledged — should show acknowledge button
    expect(screen.getAllByTitle('Acknowledge disclosure').length).toBeGreaterThan(0);
  });
});
