import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { PaymentsDashboardPage } from './PaymentsDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const todayISO = new Date().toISOString().slice(0, 10);

const mockStats = {
  totalPaymentsToday: 142,
  totalAmountToday: 8750000,
  pendingPayments: 23,
  completedPayments: 112,
  failedPayments: 7,
  avgProcessingTimeSecs: 2.4,
};

const mockRecentTransfers = [
  {
    id: 1,
    beneficiaryName: 'Adeola Johnson',
    beneficiaryAccount: '0123456789',
    bankName: 'Access Bank',
    amount: 250000,
    currency: 'NGN',
    date: `${todayISO}T09:15:00Z`,
    status: 'COMPLETED',
    direction: 'DEBIT' as const,
    reference: 'TXN-REF-001',
  },
  {
    id: 2,
    beneficiaryName: 'Chidi Okafor',
    beneficiaryAccount: '0234567890',
    bankName: 'GTBank',
    amount: 1500000,
    currency: 'NGN',
    date: `${todayISO}T10:30:00Z`,
    status: 'COMPLETED',
    direction: 'CREDIT' as const,
    reference: 'TXN-REF-002',
  },
  {
    id: 3,
    beneficiaryName: 'TechVentures Ltd',
    beneficiaryAccount: '0345678901',
    bankName: 'Zenith Bank',
    amount: 500000,
    currency: 'NGN',
    date: `${todayISO}T11:00:00Z`,
    status: 'FAILED',
    direction: 'DEBIT' as const,
    narration: 'Invoice payment',
  },
  {
    id: 4,
    beneficiaryName: 'Ngozi Eze',
    beneficiaryAccount: '0456789012',
    bankName: 'UBA',
    amount: 75000,
    currency: 'NGN',
    date: '2026-03-21T14:00:00Z',
    status: 'COMPLETED',
    direction: 'CREDIT' as const,
    reference: 'TXN-REF-004',
  },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function setupHandlers(overrides?: {
  stats?: unknown;
  transfers?: unknown;
  statsStatus?: number;
  transfersStatus?: number;
}) {
  server.use(
    http.get('/api/v1/dashboard/stats', () =>
      HttpResponse.json(
        wrap(overrides?.stats ?? mockStats),
        { status: overrides?.statsStatus ?? 200 },
      ),
    ),
    http.get('/api/v1/payments/recent', () =>
      HttpResponse.json(
        wrap(overrides?.transfers ?? mockRecentTransfers),
        { status: overrides?.transfersStatus ?? 200 },
      ),
    ),
  );
}

function setupDelayedHandlers() {
  server.use(
    http.get('/api/v1/dashboard/stats', async () => {
      await new Promise(() => {/* never resolves */});
      return HttpResponse.json(wrap(mockStats));
    }),
    http.get('/api/v1/payments/recent', async () => {
      await new Promise(() => {/* never resolves */});
      return HttpResponse.json(wrap(mockRecentTransfers));
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PaymentsDashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // -- Page Header & Subtitle -----------------------------------------------

  describe('page header', () => {
    it('renders the title', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(screen.getByText('Payments Dashboard')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(
        screen.getByText('Overview of payment operations and quick actions'),
      ).toBeInTheDocument();
    });
  });

  // -- KPI Stat Cards -------------------------------------------------------

  describe('KPI stat cards', () => {
    it('displays all stat card labels', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Payments Today')).toBeInTheDocument();
        expect(screen.getByText('Total Amount')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Avg Processing')).toBeInTheDocument();
      });
    });

    it('renders stat values from the API response', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('142')).toBeInTheDocument();
      });

      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('112')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('2.4s')).toBeInTheDocument();
    });
  });

  // -- Quick Actions --------------------------------------------------------

  describe('quick actions', () => {
    it('renders the Quick Actions heading', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it.each([
      'New Transfer',
      'Pay Bill',
      'Bulk Upload',
      'International',
      'Standing Order',
      'QR Payment',
    ])('renders the "%s" quick action button', (label) => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('navigates to /payments/new when New Transfer is clicked', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('New Transfer'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/new');
    });

    it('navigates to /payments/bills when Pay Bill is clicked', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('Pay Bill'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/bills');
    });

    it('navigates to /payments/bulk when Bulk Upload is clicked', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('Bulk Upload'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/bulk');
    });

    it('navigates to /payments/international when International is clicked', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('International'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/international');
    });
  });

  // -- Recent Activity ------------------------------------------------------

  describe('recent activity', () => {
    it('renders the Recent Activity heading', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('renders a View All link pointing to /payments/history', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      const viewAll = screen.getByText('View All');
      expect(viewAll).toBeInTheDocument();
      expect(viewAll.closest('a')).toHaveAttribute('href', '/payments/history');
    });

    it('displays beneficiary names from recent transfers', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Adeola Johnson')).toBeInTheDocument();
      });

      expect(screen.getByText('Chidi Okafor')).toBeInTheDocument();
      expect(screen.getByText('TechVentures Ltd')).toBeInTheDocument();
      expect(screen.getByText('Ngozi Eze')).toBeInTheDocument();
    });

    it('shows transaction references', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('TXN-REF-001')).toBeInTheDocument();
      });

      expect(screen.getByText('TXN-REF-002')).toBeInTheDocument();
    });

    it('falls back to narration when reference is absent', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Invoice payment')).toBeInTheDocument();
      });
    });

    it('shows empty state when there are no transfers', async () => {
      setupHandlers({ transfers: [] });
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No recent transactions')).toBeInTheDocument();
      });
    });
  });

  // -- Failed Transaction Alert ---------------------------------------------

  describe('failed transaction alert', () => {
    it('shows the failed transactions banner when there are failures', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/1 failed transaction\b/)).toBeInTheDocument();
      });
    });

    it('shows View Details button that navigates to failed history', async () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('View Details'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/history?status=FAILED');
    });

    it('does not show the failed alert when no transfers have failed', async () => {
      const transfersNoFail = mockRecentTransfers
        .filter((t) => t.status !== 'FAILED');
      setupHandlers({ transfers: transfersNoFail });
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Adeola Johnson')).toBeInTheDocument();
      });

      expect(screen.queryByText(/failed transaction/)).not.toBeInTheDocument();
    });
  });

  // -- Payment Channels -----------------------------------------------------

  describe('payment channels', () => {
    it('renders the Payment Channels heading', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(screen.getByText('Payment Channels')).toBeInTheDocument();
    });

    it.each([
      ['Payment History', '/payments/history'],
      ['Standing Orders', '/payments/standing-orders'],
      ['Cheques', '/payments/cheques'],
      ['QR Payments', '/payments/qr'],
      ['Mobile Money', '/payments/mobile-money'],
      ['ACH Operations', '/operations/ach'],
    ])('renders the "%s" channel button', (label) => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('navigates to /payments/cheques when Cheques is clicked', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('Cheques'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/cheques');
    });

    it('navigates to /operations/ach when ACH Operations is clicked', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('ACH Operations'));

      expect(mockNavigate).toHaveBeenCalledWith('/operations/ach');
    });
  });

  // -- Loading States -------------------------------------------------------

  describe('loading states', () => {
    it('shows skeleton loaders while data is being fetched', () => {
      setupDelayedHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('shows activity skeleton placeholders when transfers are loading', () => {
      setupDelayedHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      // The component renders 5 skeleton rows for the recent activity list
      const skeletonRows = document.querySelectorAll('.animate-pulse.h-12');
      expect(skeletonRows.length).toBe(5);
    });
  });

  // -- Payment Volume Chart -------------------------------------------------

  describe('payment volume chart', () => {
    it('renders the chart heading', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);
      expect(screen.getByText('Payment Volume (Last 7 Days)')).toBeInTheDocument();
    });

    it('shows empty message when there are no transfers for chart data', async () => {
      setupHandlers({ transfers: [] });
      renderWithProviders(<PaymentsDashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText('No transaction data available'),
        ).toBeInTheDocument();
      });
    });
  });

  // -- Link Navigation Targets ---------------------------------------------

  describe('link navigation targets', () => {
    it('View All link has correct href for payment history', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      const link = screen.getByText('View All').closest('a');
      expect(link).toHaveAttribute('href', '/payments/history');
    });

    it('navigates to /payments/standing-orders via Standing Order quick action', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('Standing Order'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/standing-orders');
    });

    it('navigates to /payments/qr via QR Payment quick action', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('QR Payment'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/qr');
    });

    it('navigates to /payments/mobile-money via Mobile Money channel', () => {
      setupHandlers();
      renderWithProviders(<PaymentsDashboardPage />);

      fireEvent.click(screen.getByText('Mobile Money'));

      expect(mockNavigate).toHaveBeenCalledWith('/payments/mobile-money');
    });
  });
});
