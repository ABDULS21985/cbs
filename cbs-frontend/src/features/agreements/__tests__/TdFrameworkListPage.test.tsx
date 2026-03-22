import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { TdFrameworkListPage } from '../pages/TdFrameworkListPage';
import { createMockTdFramework } from '@/test/factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockFrameworks = [
  createMockTdFramework({ id: 1, agreementNumber: 'TDF-000001', status: 'ACTIVE', customerId: 1001, currency: 'USD', baseRate: 4.5 }),
  createMockTdFramework({ id: 2, agreementNumber: 'TDF-000002', status: 'DRAFT', customerId: 1002, currency: 'EUR', baseRate: 3.0 }),
  createMockTdFramework({ id: 3, agreementNumber: 'TDF-000003', status: 'ACTIVE', customerId: 1003, currency: 'GBP', baseRate: 5.2 }),
];

function setupHandlers(frameworks = mockFrameworks) {
  server.use(
    http.get('/api/v1/td-frameworks', () => HttpResponse.json(wrap(frameworks))),
    http.get('/api/v1/td-framework-summary/large-deposits', () => HttpResponse.json(wrap([]))),
    http.post('/api/v1/td-frameworks', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(wrap(createMockTdFramework(body)), { status: 201 });
    }),
    http.post('/api/v1/td-frameworks/:number/approve', () =>
      HttpResponse.json(wrap(createMockTdFramework({ status: 'ACTIVE' }))),
    ),
    http.get('/api/v1/td-frameworks/:number/rate', () =>
      HttpResponse.json(wrap({ agreement: 'TDF-001', amount: 500000, tenor_days: 90, applicable_rate: 4.5 })),
    ),
  );
}

describe('TdFrameworkListPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    expect(screen.getByText('Term Deposit Frameworks')).toBeInTheDocument();
  });

  it('displays stat cards', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Frameworks')).toBeInTheDocument();
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });
  });

  it('loads and displays frameworks in table', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    await waitFor(() => {
      expect(screen.getByText('TDF-000001')).toBeInTheDocument();
      expect(screen.getByText('TDF-000002')).toBeInTheDocument();
    });
  });

  it('shows New Framework button', () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    expect(screen.getByText('New Framework')).toBeInTheDocument();
  });

  it('opens create dialog on button click', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    fireEvent.click(screen.getByText('New Framework'));
    await waitFor(() => {
      expect(screen.getByText('New TD Framework Agreement')).toBeInTheDocument();
      expect(screen.getByText('Customer ID *')).toBeInTheDocument();
    });
  });

  it('shows Approve button for DRAFT frameworks as admin', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });
  });

  it('shows Check Rate button for ACTIVE frameworks', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    await waitFor(() => {
      const checkRateButtons = screen.getAllByText('Check Rate');
      expect(checkRateButtons.length).toBeGreaterThan(0);
    });
  });

  it('opens approve dialog when Approve clicked', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />, {
      user: { roles: ['CBS_ADMIN'] },
    });
    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(screen.getByText(/Your identity will be recorded as the approver/)).toBeInTheDocument();
    });
  });

  it('opens rate calculator dialog when Check Rate clicked', async () => {
    setupHandlers();
    renderWithProviders(<TdFrameworkListPage />);
    await waitFor(() => {
      const checkRateButtons = screen.getAllByText('Check Rate');
      expect(checkRateButtons.length).toBeGreaterThan(0);
      fireEvent.click(checkRateButtons[0]);
    });
    await waitFor(() => {
      expect(screen.getByText(/Rate Calculator/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no frameworks', async () => {
    setupHandlers([]);
    renderWithProviders(<TdFrameworkListPage />);
    await waitFor(() => {
      expect(screen.getByText('No TD framework agreements found.')).toBeInTheDocument();
    });
  });
});
