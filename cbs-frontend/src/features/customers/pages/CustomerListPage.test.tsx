import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { createMockUser } from '@/test/factories/userFactory';
import { server } from '@/test/msw/server';
import CustomerListPage from './CustomerListPage';

const wrap = (data: unknown, page = { page: 0, size: 25, totalElements: 0, totalPages: 0 }) => ({
  success: true,
  data,
  page,
  timestamp: new Date().toISOString(),
});

const mockCustomers = [
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
    status: 'DORMANT',
    riskRating: 'HIGH',
    fullName: 'TechVentures Limited',
    email: 'ops@techventures.example',
    phonePrimary: '+2348098765432',
    branchCode: 'ABJ01',
    createdAt: '2024-02-20T11:30:00Z',
  },
];

const mockCounts = {
  total: 1500,
  active: 1200,
  dormant: 250,
  suspended: 25,
  closed: 10,
  newMtd: 45,
};

function setupHandlers(options?: {
  customers?: typeof mockCustomers;
  counts?: typeof mockCounts;
  onCustomersRequest?: (params: URLSearchParams) => void;
  totalElements?: number;
}) {
  const { customers = mockCustomers, counts = mockCounts, onCustomersRequest, totalElements } = options ?? {};

  server.use(
    http.get('/api/v1/customers', ({ request }) => {
      const url = new URL(request.url);
      onCustomersRequest?.(url.searchParams);
      const size = Number(url.searchParams.get('size') ?? '25');
      return HttpResponse.json(
        wrap(customers, {
          page: Number(url.searchParams.get('page') ?? '0'),
          size,
          totalElements: totalElements ?? customers.length,
          totalPages: totalElements ? Math.ceil(totalElements / size) : customers.length ? 1 : 0,
        }),
      );
    }),
    http.get('/api/v1/customers/count', () =>
      HttpResponse.json({ success: true, data: counts, timestamp: new Date().toISOString() }),
    ),
  );
}

describe('CustomerListPage', () => {
  it('renders the live customer list and counts', async () => {
    setupHandlers();

    renderWithProviders(<CustomerListPage />);

    expect(screen.getByPlaceholderText(/search by name, cif, email, or phone/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Customers')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('CIF0000001')).toBeInTheDocument();
    expect(screen.getByText('TechVentures Limited')).toBeInTheDocument();
    expect(screen.getByText('HQ01')).toBeInTheDocument();
  });

  it('shows the empty state when the backend returns no customers', async () => {
    setupHandlers({ customers: [] });

    renderWithProviders(<CustomerListPage />);

    await waitFor(() => {
      expect(screen.getByText(/no customers match the current filters/i)).toBeInTheDocument();
    });
  });

  it('shows or hides the create action based on permissions', async () => {
    setupHandlers();

    const admin = createMockUser({
      id: 'u1',
      username: 'admin',
      fullName: 'Admin User',
      email: 'admin@example.com',
      roles: ['CBS_ADMIN'],
      permissions: ['*'],
    });
    const viewer = createMockUser({
      id: 'u2',
      username: 'viewer',
      fullName: 'Viewer User',
      email: 'viewer@example.com',
      roles: ['CBS_VIEWER'],
      permissions: [],
    });

    const adminRender = renderWithProviders(<CustomerListPage />, { user: admin });
    expect(screen.getByText('New Customer')).toBeInTheDocument();
    adminRender.unmount();

    renderWithProviders(<CustomerListPage />, { user: viewer });
    expect(screen.queryByText('New Customer')).not.toBeInTheDocument();
  });

  it('sends live type and status filter params to the backend', async () => {
    let lastRequest = new URLSearchParams();
    setupHandlers({
      onCustomersRequest: (params) => {
        lastRequest = new URLSearchParams(params);
      },
    });

    renderWithProviders(<CustomerListPage />);

    // Expand the filter panel
    fireEvent.click(screen.getByText('Filters'));

    // Click the 'Corporate' button in the Customer Type section
    fireEvent.click(screen.getByRole('button', { name: /🏛\s*Corporate/i }));
    // Click the 'Dormant' status button
    fireEvent.click(screen.getByRole('button', { name: /Dormant/i }));

    await waitFor(() => {
      expect(lastRequest.get('type')).toBe('CORPORATE');
      expect(lastRequest.get('status')).toBe('DORMANT');
    });
  });

  it('debounces search input before sending the search param', async () => {
    let lastRequest = new URLSearchParams();
    setupHandlers({
      onCustomersRequest: (params) => {
        lastRequest = new URLSearchParams(params);
      },
    });

    renderWithProviders(<CustomerListPage />);

    fireEvent.change(screen.getByPlaceholderText(/search by name, cif, email, or phone/i), {
      target: { value: 'Amara' },
    });

    expect(lastRequest.get('search')).not.toBe('Amara');

    await waitFor(() => {
      expect(lastRequest.get('search')).toBe('Amara');
    }, { timeout: 2000 });
  });

  it('sends server pagination params when the user changes pages', async () => {
    let lastRequest = new URLSearchParams();
    setupHandlers({
      totalElements: 40,
      onCustomersRequest: (params) => {
        lastRequest = new URLSearchParams(params);
      },
    });

    renderWithProviders(<CustomerListPage />);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/next page/i));

    await waitFor(() => {
      expect(lastRequest.get('page')).toBe('1');
    });
  });

  it('sends backend sort fields when clicking sortable column headers', async () => {
    let lastRequest = new URLSearchParams();
    setupHandlers({
      onCustomersRequest: (params) => {
        lastRequest = new URLSearchParams(params);
      },
    });

    renderWithProviders(<CustomerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    // 'Status' is a sortable column header
    fireEvent.click(screen.getByRole('button', { name: /status/i }));

    await waitFor(() => {
      expect(lastRequest.get('sort')).toBe('status');
      expect(['asc', 'desc']).toContain(lastRequest.get('direction'));
    });
  });
});
