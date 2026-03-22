import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import KycDashboardPage from './KycDashboardPage';

// ── helpers ─────────────────────────────────────────────────────────────────

const wrap = (data: unknown, page?: Record<string, number>) => ({
  success: true,
  data,
  page: page ?? { page: 0, size: 20, totalElements: 0, totalPages: 0 },
  timestamp: new Date().toISOString(),
});

const mockStats = { total: 500, verified: 300, expired: 50, pending: 150 };

const mockKycList = [
  {
    id: 1,
    cifNumber: 'CIF0000001',
    customerType: 'INDIVIDUAL',
    status: 'ACTIVE',
    riskRating: 'LOW',
    fullName: 'Amara Okonkwo',
    email: 'amara@example.com',
    phonePrimary: '+2348012345678',
    branchCode: 'HQ01',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    cifNumber: 'CIF0000002',
    customerType: 'CORPORATE',
    status: 'ACTIVE',
    riskRating: 'HIGH',
    fullName: 'TechVentures Limited',
    email: 'ops@techventures.example',
    phonePrimary: '+2348098765432',
    branchCode: 'ABJ01',
    createdAt: '2024-02-20T11:30:00Z',
  },
];

// Backend returns { customerId, customerName, riskRating, lastReviewDate } — NOT id/fullName
const mockReviewsDue = [
  {
    customerId: 1,
    customerName: 'Amara Okonkwo',
    riskRating: 'HIGH',
    lastReviewDate: '2025-01-15T10:00:00Z',
  },
  {
    customerId: 2,
    customerName: 'Emeka Dike',
    riskRating: 'PEP',
    lastReviewDate: '2025-01-20T09:00:00Z',
  },
  {
    customerId: 3,
    customerName: 'Kemi Adewale',
    riskRating: 'MEDIUM',
    lastReviewDate: '2025-01-25T08:00:00Z',
  },
];

function setupHandlers(options?: {
  stats?: typeof mockStats;
  list?: typeof mockKycList;
  reviewsDue?: typeof mockReviewsDue;
  onCompleteReview?: (customerId: string) => void;
  onInitiateEdd?: (customerId: string) => void;
  onKycListRequest?: (params: URLSearchParams) => void;
}) {
  const {
    stats = mockStats,
    list = mockKycList,
    reviewsDue = mockReviewsDue,
    onCompleteReview,
    onInitiateEdd,
    onKycListRequest,
  } = options ?? {};

  server.use(
    http.get('/api/v1/customers/kyc/stats', () =>
      HttpResponse.json(wrap(stats)),
    ),

    http.get('/api/v1/customers/kyc', ({ request }) => {
      const url = new URL(request.url);
      onKycListRequest?.(url.searchParams);
      return HttpResponse.json(
        wrap(list, { page: 0, size: 20, totalElements: list.length, totalPages: 1 }),
      );
    }),

    http.get('/api/v1/customers/kyc/reviews-due', () =>
      HttpResponse.json(wrap(reviewsDue)),
    ),

    http.post('/api/v1/customers/:customerId/kyc/complete-review', ({ params }) => {
      onCompleteReview?.(params.customerId as string);
      return HttpResponse.json(
        wrap({ customerId: params.customerId, status: 'REVIEW_COMPLETED' }),
      );
    }),

    http.post('/api/v1/customers/:customerId/edd/initiate', ({ params }) => {
      onInitiateEdd?.(params.customerId as string);
      return HttpResponse.json(
        { success: true, data: { customerId: params.customerId, status: 'EDD_INITIATED' }, timestamp: new Date().toISOString() },
        { status: 201 },
      );
    }),
  );
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('KycDashboardPage', () => {
  it('renders stat cards from /kyc/stats', async () => {
    setupHandlers();
    renderWithProviders(<KycDashboardPage />);

    // Wait for the actual stat value to appear inside a stat card (stat-value class)
    await waitFor(() => {
      const statValues = document.querySelectorAll('.stat-value');
      const values = Array.from(statValues).map((el) => el.textContent);
      expect(values).toContain('150');
    });

    // verified=300 appears as stat card value
    const statValues = document.querySelectorAll('.stat-value');
    const values = Array.from(statValues).map((el) => el.textContent);
    expect(values).toContain('300');
    expect(values).toContain('50');
  });

  it('renders the KYC customer list', async () => {
    setupHandlers();
    renderWithProviders(<KycDashboardPage />);

    await waitFor(() => {
      // CIF number is unique to the table
      expect(screen.getByText('CIF0000001')).toBeInTheDocument();
    });

    expect(screen.getByText('TechVentures Limited')).toBeInTheDocument();
    expect(screen.getByText('CIF0000002')).toBeInTheDocument();
  });

  it('sends kycStatus=UNVERIFIED by default and switches to VERIFIED on tab click', async () => {
    const requests: string[] = [];
    setupHandlers({
      onKycListRequest: (params) => {
        requests.push(params.get('kycStatus') ?? 'null');
      },
    });

    renderWithProviders(<KycDashboardPage />);

    // Default tab is UNVERIFIED
    await waitFor(() => {
      expect(requests).toContain('UNVERIFIED');
    });

    // Click the "Verified" tab button specifically (has tab-specific role/class)
    const tabBar = screen.getByRole('button', { name: 'Verified' });
    fireEvent.click(tabBar);

    await waitFor(() => {
      expect(requests).toContain('VERIFIED');
    });
  });

  it('sends no kycStatus param when All tab is selected', async () => {
    const requests: string[] = [];
    setupHandlers({
      onKycListRequest: (params) => {
        requests.push(params.get('kycStatus') ?? '__absent__');
      },
    });

    renderWithProviders(<KycDashboardPage />);

    // Click All tab
    fireEvent.click(screen.getByText('All'));

    await waitFor(() => {
      expect(requests).toContain('__absent__');
    });
  });

  it('renders reviews-due section with backend customerName and lastReviewDate fields', async () => {
    // Override: no kyc list customers so names only come from reviews-due section
    setupHandlers({ list: [] });
    renderWithProviders(<KycDashboardPage />);

    await waitFor(() => {
      // customerName (not fullName) from backend reviews-due response
      expect(screen.getByText('Emeka Dike')).toBeInTheDocument();
    });

    expect(screen.getByText('Kemi Adewale')).toBeInTheDocument();
  });

  it('calls complete-review with correct customerId (not id)', async () => {
    const completedIds: string[] = [];
    // Use empty list so reviews-due names are unique
    setupHandlers({ list: [], onCompleteReview: (id) => completedIds.push(id) });

    renderWithProviders(<KycDashboardPage />);

    // Wait for the reviews due section to render with customerName from backend
    await waitFor(() => {
      expect(screen.getByText('Emeka Dike')).toBeInTheDocument();
    });

    // Click the first "Complete Review" button
    const buttons = screen.getAllByText('Complete Review');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      // Should use customerId=1, NOT id (which would be undefined)
      expect(completedIds).toContain('1');
    });
  });

  it('calls edd/initiate with correct customerId for HIGH-risk customers', async () => {
    const eddIds: string[] = [];
    setupHandlers({ onInitiateEdd: (id) => eddIds.push(id) });

    renderWithProviders(<KycDashboardPage />);

    // Expand the EDD section (it starts collapsed)
    const eddSection = screen.getByText('Enhanced Due Diligence (EDD)');
    fireEvent.click(eddSection);

    await waitFor(() => {
      // HIGH and PEP risk customers should appear in EDD section
      const initiateButtons = screen.getAllByText('Initiate EDD');
      expect(initiateButtons.length).toBeGreaterThan(0);
    });

    const initiateButtons = screen.getAllByText('Initiate EDD');
    fireEvent.click(initiateButtons[0]);

    await waitFor(() => {
      // Should use customerId=1 (HIGH risk) or customerId=2 (PEP), NOT undefined
      expect(eddIds.some((id) => id === '1' || id === '2')).toBe(true);
    });
  });

  it('shows EDD active count for HIGH and PEP risk customers in reviews-due', async () => {
    setupHandlers();
    renderWithProviders(<KycDashboardPage />);

    await waitFor(() => {
      // EDD Active count = 2 (customerId=1 HIGH, customerId=2 PEP)
      expect(screen.getByText('EDD Active')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('derives risk rating breakdown from loaded customer list', async () => {
    // Use unique list (no overlap with reviews-due names)
    setupHandlers({ reviewsDue: [] });
    renderWithProviders(<KycDashboardPage />);

    await waitFor(() => {
      // Wait for list data — CIF is unique
      expect(screen.getByText('CIF0000001')).toBeInTheDocument();
    });

    // From mockKycList: 1 LOW, 0 MEDIUM, 1 HIGH — breakdown should not show '--'
    expect(screen.getByText('Based on current page (2 records).')).toBeInTheDocument();
  });

  it('shows empty state when no customers match the selected KYC state', async () => {
    setupHandlers({ list: [] });
    renderWithProviders(<KycDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no customers match the selected kyc state/i)).toBeInTheDocument();
    });
  });

  it('shows no reviews due message when reviews-due list is empty', async () => {
    setupHandlers({ reviewsDue: [] });
    renderWithProviders(<KycDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/no periodic reviews due this month/i)).toBeInTheDocument();
    });
  });
});
