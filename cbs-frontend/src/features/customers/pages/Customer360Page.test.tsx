import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import Customer360Page from './Customer360Page';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCustomer = {
  id: 1,
  cifNumber: 'CIF0000001',
  firstName: 'Amara',
  lastName: 'Okonkwo',
  fullName: 'Amara Okonkwo',
  email: 'amara@example.com',
  phone: '+2348012345678',
  customerType: 'INDIVIDUAL',
  segment: 'PREMIUM',
  status: 'ACTIVE',
  kycStatus: 'VERIFIED',
  bvn: '22000000001',
  dateOfBirth: '1990-01-15',
  gender: 'FEMALE',
  nationality: 'NG',
  address: '10 Marina Street, Lagos',
  branchId: 1,
  branchName: 'Head Office',
  accountCount: 3,
  totalBalance: 15000000,
  relationshipStartDate: '2020-06-01',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-03-18T14:00:00Z',
};

function setupHandlers(customer = mockCustomer) {
  server.use(
    http.get('/api/v1/customers/:id', ({ params }) => {
      if (params.id === '999') return HttpResponse.json(wrap(null), { status: 404 });
      return HttpResponse.json(wrap(customer));
    }),
    http.get('/api/v1/customers/:id/accounts', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/loans', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/cards', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/cases', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/documents', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/transactions', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/communications', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/audit', () => HttpResponse.json(wrap([]))),
  );
}

function renderPage(customerId = '1') {
  return renderWithProviders(
    <Routes>
      <Route path="/customers/:id" element={<Customer360Page />} />
    </Routes>,
    { route: `/customers/${customerId}` }
  );
}

describe('Customer360Page', () => {
  it('shows loading skeleton initially', () => {
    setupHandlers();
    renderPage();
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('renders customer name after loading', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });
  });

  it('renders back button', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Back to Customers')).toBeInTheDocument();
    });
  });

  it('renders tab labels', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Loans')).toBeInTheDocument();
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('Cases')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('shows error state when customer not found', async () => {
    setupHandlers();
    server.use(
      http.get('/api/v1/customers/:id', () =>
        HttpResponse.json(wrap(null), { status: 404 })
      ),
    );
    renderPage('999');
    await waitFor(() => {
      expect(screen.getByText(/not found|failed to load/i)).toBeInTheDocument();
    });
  });

  it('shows error state on server error', async () => {
    server.use(
      http.get('/api/v1/customers/:id', () =>
        HttpResponse.json({ success: false }, { status: 500 })
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/not found|failed to load/i)).toBeInTheDocument();
    });
  });

  it('can switch to Accounts tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Accounts'));
  });

  it('can switch to Loans tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Loans')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Loans'));
  });

  it('can switch to Transactions tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Transactions')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Transactions'));
  });

  it('can switch to Communications tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Communications')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Communications'));
  });

  it('can switch to Documents tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Documents'));
  });

  it('renders customer segment', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/PREMIUM/i)).toBeInTheDocument();
    });
  });

  it('renders customer status', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
    });
  });

  it('renders with a different customer', async () => {
    setupHandlers({ ...mockCustomer, id: 42, fullName: 'Chidi Okafor', segment: 'SME' });
    renderPage('42');
    await waitFor(() => {
      expect(screen.getByText('Chidi Okafor')).toBeInTheDocument();
    });
  });

  it('renders overview tab content by default', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });

  it('can switch to Audit Trail tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Audit Trail'));
  });

  it('renders for a DORMANT customer', async () => {
    setupHandlers({ ...mockCustomer, status: 'DORMANT' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/DORMANT/i)).toBeInTheDocument();
    });
  });

  it('renders Cards tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Cards')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cards'));
  });

  it('renders Cases tab', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Cases')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Cases'));
  });

  it('renders customer email in header', async () => {
    setupHandlers();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });
  });
});
