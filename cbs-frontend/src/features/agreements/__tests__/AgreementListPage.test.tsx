import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { AgreementListPage } from '../pages/AgreementListPage';
import { createMockAgreement } from '@/test/factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAgreements = [
  createMockAgreement({ id: 1, status: 'ACTIVE', title: 'Master Service Agreement', agreementNumber: 'AGR-000001' }),
  createMockAgreement({ id: 2, status: 'DRAFT', title: 'NDA Agreement', agreementNumber: 'AGR-000002', agreementType: 'NDA' }),
  createMockAgreement({ id: 3, status: 'TERMINATED', title: 'Old Agreement', agreementNumber: 'AGR-000003' }),
  createMockAgreement({ id: 4, status: 'ACTIVE', title: 'Channel Access', agreementNumber: 'AGR-000004', effectiveTo: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] }),
];

function setupHandlers(data = mockAgreements) {
  server.use(
    http.get('/api/v1/agreements', () => HttpResponse.json(wrap(data))),
  );
}

describe('AgreementListPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    expect(screen.getByText('Customer Agreements')).toBeInTheDocument();
  });

  it('displays stat cards after loading', async () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Agreements')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
    });
  });

  it('loads and displays agreements in table', async () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      expect(screen.getByText('AGR-000001')).toBeInTheDocument();
      expect(screen.getByText('Master Service Agreement')).toBeInTheDocument();
    });
  });

  it('shows correct active count', async () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      const statValues = screen.getAllByText('2');
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  it('filters by status', async () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      expect(screen.getByText('AGR-000001')).toBeInTheDocument();
    });
    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'DRAFT' } });
    await waitFor(() => {
      expect(screen.getByText('AGR-000002')).toBeInTheDocument();
      expect(screen.queryByText('AGR-000001')).not.toBeInTheDocument();
    });
  });

  it('filters by search text', async () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      expect(screen.getByText('AGR-000001')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search by number, title, customer...');
    fireEvent.change(searchInput, { target: { value: 'NDA' } });
    await waitFor(() => {
      expect(screen.getByText('AGR-000002')).toBeInTheDocument();
      expect(screen.queryByText('AGR-000001')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no agreements', async () => {
    setupHandlers([]);
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      expect(screen.getByText('No agreements match your filters')).toBeInTheDocument();
    });
  });

  it('shows New Agreement button', () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    expect(screen.getByText('New Agreement')).toBeInTheDocument();
  });

  it('shows filter count', async () => {
    setupHandlers();
    renderWithProviders(<AgreementListPage />);
    await waitFor(() => {
      expect(screen.getByText(/4 of 4 agreements/)).toBeInTheDocument();
    });
  });
});
