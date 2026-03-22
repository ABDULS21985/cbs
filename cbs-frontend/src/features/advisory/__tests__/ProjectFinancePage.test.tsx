import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { ProjectFinancePage } from '../pages/ProjectFinancePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockFacilities = [
  {
    id: 1, facilityCode: 'PF-001', projectName: 'Lagos Rail Transit',
    projectType: 'INFRASTRUCTURE', borrowerName: 'SPV Holdings', spvName: 'Rail SPV',
    country: 'NGA', currency: 'USD', totalProjectCost: 500000000,
    debtAmount: 350000000, equityAmount: 150000000, ourShare: 50000000,
    disbursedAmount: 100000000, tenorMonths: 120, gracePeriodMonths: 24,
    baseRate: 'SOFR', marginBps: 350, creditRating: 'BB+',
    countryRisk: 'MEDIUM', environmentalCategory: 'A',
    financialCovenants: {}, securityPackage: {}, status: 'DISBURSING',
  },
  {
    id: 2, facilityCode: 'PF-002', projectName: 'Solar Farm Kaduna',
    projectType: 'RENEWABLE_ENERGY', borrowerName: 'Green Energy Ltd',
    country: 'NGA', currency: 'USD', totalProjectCost: 80000000,
    debtAmount: 56000000, equityAmount: 24000000, ourShare: 20000000,
    disbursedAmount: 0, tenorMonths: 180, gracePeriodMonths: 36,
    baseRate: 'SOFR', marginBps: 400, creditRating: 'B+',
    countryRisk: 'HIGH', environmentalCategory: 'B', status: 'APPROVED',
  },
];

const mockMilestones = [
  {
    id: 1, milestoneCode: 'MS-001', facilityId: 1,
    milestoneName: 'Financial Close', milestoneType: 'CONDITION_PRECEDENT',
    description: 'All CPs satisfied', dueDate: '2025-03-01',
    completedDate: '2025-02-28', disbursementLinked: true,
    disbursementAmount: 50000000, status: 'COMPLETED',
  },
  {
    id: 2, milestoneCode: 'MS-002', facilityId: 1,
    milestoneName: 'Phase 1 Construction', milestoneType: 'CONSTRUCTION',
    description: 'First segment completion', dueDate: '2025-12-01',
    completedDate: null, disbursementLinked: true,
    disbursementAmount: 100000000, status: 'PENDING',
  },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/project-finance', () => HttpResponse.json(wrap(mockFacilities))),
    http.get('/api/v1/project-finance/:code/milestones', () => HttpResponse.json(wrap(mockMilestones))),
    http.post('/api/v1/project-finance', () => HttpResponse.json(wrap({
      ...mockFacilities[0], id: 3, facilityCode: 'PF-003',
    }))),
    http.post('/api/v1/project-finance/:code/milestones', () => HttpResponse.json(wrap({
      id: 3, milestoneCode: 'MS-003', milestoneName: 'Test', status: 'PENDING',
    }))),
    http.post('/api/v1/project-finance/milestones/:code/complete', () => HttpResponse.json(wrap({
      ...mockMilestones[1], status: 'COMPLETED', completedDate: '2025-06-01',
    }))),
  );
}

describe('ProjectFinancePage', () => {
  it('renders page header and new project button', () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    expect(screen.getByText('Project Finance')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('renders stat cards', async () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('Active Facilities')).toBeInTheDocument();
    });
    expect(screen.getByText('Total Debt')).toBeInTheDocument();
    expect(screen.getByText('Total Equity')).toBeInTheDocument();
    expect(screen.getByText('Defaulted')).toBeInTheDocument();
  });

  it('loads and displays facilities', async () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('PF-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Lagos Rail Transit')).toBeInTheDocument();
    expect(screen.getByText('SPV Holdings')).toBeInTheDocument();
    expect(screen.getByText('PF-002')).toBeInTheDocument();
  });

  it('opens new project dialog', async () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    fireEvent.click(screen.getByText('New Project'));
    await waitFor(() => {
      expect(screen.getByText('New Project Finance Facility')).toBeInTheDocument();
    });
    expect(screen.getByText('Project Name *')).toBeInTheDocument();
    expect(screen.getByText('Borrower Name *')).toBeInTheDocument();
    expect(screen.getByText('Tenor (months) *')).toBeInTheDocument();
  });

  it('expands facility to show milestones', async () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('PF-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Lagos Rail Transit'));

    await waitFor(() => {
      expect(screen.getByText('Milestones')).toBeInTheDocument();
    });
    expect(screen.getByText('Financial Close')).toBeInTheDocument();
    expect(screen.getByText('Phase 1 Construction')).toBeInTheDocument();
  });

  it('shows complete button for pending milestones', async () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('PF-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Lagos Rail Transit'));

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    setupHandlers();
    renderWithProviders(<ProjectFinancePage />);
    await waitFor(() => {
      expect(screen.getByText('PF-001')).toBeInTheDocument();
    });

    const statusSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(statusSelect, { target: { value: 'APPROVED' } });

    await waitFor(() => {
      expect(screen.queryByText('PF-001')).not.toBeInTheDocument();
      expect(screen.getByText('PF-002')).toBeInTheDocument();
    });
  });
});
