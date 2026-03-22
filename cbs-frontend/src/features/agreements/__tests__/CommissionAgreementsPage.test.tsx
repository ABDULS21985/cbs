import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { CommissionAgreementsPage } from '../pages/CommissionAgreementsPage';
import { createMockCommissionAgreement, createMockCommissionPayout } from '@/test/factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAgreements = [
  createMockCommissionAgreement({ id: 1, agreementCode: 'CA-001', agreementName: 'Agent Commission Q1', status: 'ACTIVE', partyId: 'AGT-001', partyName: 'John Agent' }),
  createMockCommissionAgreement({ id: 2, agreementCode: 'CA-002', agreementName: 'Broker Commission', status: 'DRAFT', partyId: 'BRK-001', partyName: 'Broker Inc' }),
];

const mockPayouts = [
  createMockCommissionPayout({ id: 1, payoutCode: 'PO-001', status: 'CALCULATED', partyId: 'AGT-001', partyName: 'John Agent', netCommission: 360000 }),
  createMockCommissionPayout({ id: 2, payoutCode: 'PO-002', status: 'APPROVED', partyId: 'AGT-001', partyName: 'John Agent', netCommission: 280000 }),
];

function setupHandlers(agreements = mockAgreements) {
  server.use(
    http.get('/api/v1/commissions/agreements', () => HttpResponse.json(wrap(agreements))),
    http.get('/api/v1/commissions/payouts/party/:id', () => HttpResponse.json(wrap(mockPayouts))),
    http.post('/api/v1/commissions/agreements/:code/activate', () =>
      HttpResponse.json(wrap(createMockCommissionAgreement({ status: 'ACTIVE' }))),
    ),
    http.post('/api/v1/commissions/agreements/:code/calculate-payout', () =>
      HttpResponse.json(wrap(createMockCommissionPayout()), { status: 201 }),
    ),
    http.post('/api/v1/commissions/payouts/:code/approve', () =>
      HttpResponse.json(wrap(createMockCommissionPayout({ status: 'APPROVED' }))),
    ),
    http.post('/api/v1/commissions/agreements', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(wrap(createMockCommissionAgreement(body)), { status: 201 });
    }),
  );
}

describe('CommissionAgreementsPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />);
    expect(screen.getByText('Commission Management')).toBeInTheDocument();
  });

  it('shows stat cards', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Agreements')).toBeInTheDocument();
      expect(screen.getByText('Active Agreements')).toBeInTheDocument();
      expect(screen.getByText('Total Parties')).toBeInTheDocument();
    });
  });

  it('displays agreements in table', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />);
    await waitFor(() => {
      expect(screen.getByText('CA-001')).toBeInTheDocument();
      expect(screen.getByText('Agent Commission Q1')).toBeInTheDocument();
    });
  });

  it('shows New Agreement button for admins', () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    expect(screen.getByText('New Agreement')).toBeInTheDocument();
  });

  it('hides New Agreement button for non-admins', () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />, {
      user: { roles: ['CBS_OFFICER'] },
    });
    expect(screen.queryByText('New Agreement')).not.toBeInTheDocument();
  });

  it('shows Activate button for DRAFT agreements as admin', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });

  it('shows Calc Payout button for ACTIVE agreements as admin', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    await waitFor(() => {
      expect(screen.getByText('Calc Payout')).toBeInTheDocument();
    });
  });

  it('opens create dialog when New Agreement is clicked', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    fireEvent.click(screen.getByText('New Agreement'));
    await waitFor(() => {
      expect(screen.getByText('New Commission Agreement')).toBeInTheDocument();
      expect(screen.getByText('Agreement Name')).toBeInTheDocument();
    });
  });

  it('opens payout calculator when Calc Payout is clicked', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    await waitFor(() => {
      expect(screen.getByText('Calc Payout')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Calc Payout'));
    await waitFor(() => {
      expect(screen.getByText('Calculate Payout')).toBeInTheDocument();
      expect(screen.getByText('Gross Sales')).toBeInTheDocument();
    });
  });

  it('shows agreements and payouts tabs', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />);
    expect(screen.getByText('agreements')).toBeInTheDocument();
    expect(screen.getByText('payouts')).toBeInTheDocument();
  });

  it('switches to payouts tab', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />);
    fireEvent.click(screen.getByText('payouts'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter Party ID...')).toBeInTheDocument();
    });
  });

  it('filters agreements by status', async () => {
    setupHandlers();
    renderWithProviders(<CommissionAgreementsPage />);
    await waitFor(() => {
      expect(screen.getByText('CA-001')).toBeInTheDocument();
    });
    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
    await waitFor(() => {
      expect(screen.getByText('CA-001')).toBeInTheDocument();
      expect(screen.queryByText('CA-002')).not.toBeInTheDocument();
    });
  });
});
