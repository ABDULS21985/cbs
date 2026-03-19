import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import CustomerListPage from './CustomerListPage';

const wrap = (data: unknown, page = { page: 0, size: 20, totalElements: 0, totalPages: 0 }) => ({
  success: true,
  data,
  page,
  timestamp: new Date().toISOString(),
});

const mockCustomers = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  customerNumber: `CUS-${String(i + 1).padStart(3, '0')}`,
  fullName: `Customer ${i + 1}`,
  type: i === 0 ? 'INDIVIDUAL' : 'CORPORATE',
  status: 'ACTIVE',
  segment: 'RETAIL',
  phone: `+2348000000${i}`,
  totalBalance: 5000000 + i * 100000,
  branchName: 'Head Office',
  dateOpened: '2024-01-15',
}));

const mockCounts = { total: 1500, active: 1200, dormant: 250, newMtd: 45 };

function setupHandlers(customers = mockCustomers, counts = mockCounts) {
  server.use(
    http.get('/api/v1/customers', () =>
      HttpResponse.json(wrap(customers, { page: 0, size: 20, totalElements: customers.length, totalPages: 1 }))
    ),
    http.get('/api/v1/customers/counts', () =>
      HttpResponse.json({ success: true, data: counts, timestamp: new Date().toISOString() })
    ),
  );
}

describe('CustomerListPage', () => {
  it('renders the search input', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders stat cards with customer counts', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
    });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Dormant')).toBeInTheDocument();
    expect(screen.getByText('New (MTD)')).toBeInTheDocument();
  });

  it('displays customer data in the table after loading', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText('Customer 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Customer 2')).toBeInTheDocument();
    expect(screen.getByText('Customer 3')).toBeInTheDocument();
  });

  it('shows customer numbers in the table', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText('CUS-001')).toBeInTheDocument();
    });
  });

  it('shows empty state when no customers match', async () => {
    setupHandlers([]);
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText(/no customers match/i)).toBeInTheDocument();
    });
  });

  it('renders the "New Customer" button for users with create permission', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />, {
      user: { id: 'u1', username: 'admin', firstName: 'A', lastName: 'B', email: 'a@b.com', roles: ['CBS_ADMIN'], branchId: 'br-001', branchName: 'HQ', department: 'Ops', permissions: ['*'], mfaEnabled: false },
    });
    expect(screen.getByText('New Customer')).toBeInTheDocument();
  });

  it('hides "New Customer" button for users without create permission', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />, {
      user: { id: 'u1', username: 'viewer', firstName: 'V', lastName: 'W', email: 'v@b.com', roles: ['CBS_VIEWER'], branchId: 'br-001', branchName: 'HQ', department: 'Ops', permissions: [], mfaEnabled: false },
    });
    expect(screen.queryByText('New Customer')).not.toBeInTheDocument();
  });

  it('renders the Filters button', () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('opens filter panel when Filters button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
  });

  it('shows Reset button in filter panel', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('allows typing in the search input', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    const input = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(input, { target: { value: 'Amara' } });
    expect(input).toHaveValue('Amara');
  });

  it('displays the correct table column headers', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText('Customer #')).toBeInTheDocument();
    });
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders customer type badge', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText('INDIVIDUAL')).toBeInTheDocument();
    });
  });

  it('renders customer status badge', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    });
  });

  it('can select a type filter', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const typeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(typeSelect, { target: { value: 'CORPORATE' } });
    expect(typeSelect).toHaveValue('CORPORATE');
  });

  it('can select a status filter', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'DORMANT' } });
    expect(statusSelect).toHaveValue('DORMANT');
  });

  it('can select a status filter value', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    expect(statusSelect).toHaveValue('ACTIVE');
  });

  it('resets all filters when Reset is clicked', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    const typeSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(typeSelect, { target: { value: 'CORPORATE' } });
    fireEvent.click(screen.getByText('Reset'));
    expect(typeSelect).toHaveValue('');
  });

  it('shows dash placeholders when counts are not loaded', () => {
    server.use(
      http.get('/api/v1/customers/counts', () => HttpResponse.error()),
    );
    renderWithProviders(<CustomerListPage />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('handles server error on customers fetch gracefully', async () => {
    server.use(
      http.get('/api/v1/customers', () => HttpResponse.json({ success: false }, { status: 500 })),
    );
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText(/no customers match/i)).toBeInTheDocument();
    });
  });

  it('renders initials avatar for customer names', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    await waitFor(() => {
      expect(screen.getByText('Customer 1')).toBeInTheDocument();
    });
    // Check that initials are rendered (first letters of first and last name)
    const initials = document.querySelectorAll('.rounded-full');
    expect(initials.length).toBeGreaterThan(0);
  });

  it('closes filter panel when Filters button is clicked again', async () => {
    setupHandlers();
    renderWithProviders(<CustomerListPage />);
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('All Types')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.queryByText('All Types')).not.toBeInTheDocument();
  });
});
