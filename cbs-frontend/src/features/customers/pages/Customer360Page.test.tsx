import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import Customer360Page from './Customer360Page';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockCustomer = {
  id: 1,
  cifNumber: 'CIF0000001',
  customerType: 'INDIVIDUAL',
  status: 'ACTIVE',
  riskRating: 'LOW',
  fullName: 'Amara Okonkwo',
  firstName: 'Amara',
  lastName: 'Okonkwo',
  email: 'amara@example.com',
  phonePrimary: '+2348012345678',
  branchCode: 'HQ01',
  createdAt: '2024-01-15T10:00:00Z',
  dateOfBirth: '1990-01-15',
  gender: 'FEMALE',
  nationality: 'NGA',
  preferredLanguage: 'English',
  preferredChannel: 'MOBILE',
  relationshipManager: 'RM-001',
  onboardedChannel: 'BRANCH',
  addresses: [
    {
      id: 10,
      addressType: 'RESIDENTIAL',
      addressLine1: '10 Marina Street',
      city: 'Lagos',
      country: 'NGA',
      isPrimary: true,
    },
  ],
  identifications: [
    {
      id: 100,
      idType: 'BVN',
      idNumber: '12345678901',
      isVerified: true,
      expiryDate: '2030-01-01',
    },
  ],
  contacts: [
    { id: 200, contactType: 'EMAIL', contactValue: 'amara@example.com', isPrimary: true },
  ],
  relationships: [],
  notes: [],
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/customers/:id', ({ params }) => {
      if (params.id === '999') {
        return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      }
      return HttpResponse.json(wrap(mockCustomer));
    }),
    http.get('/api/v1/accounts/customer/:id', () =>
      HttpResponse.json(
        wrap([
          {
            id: 1,
            accountNumber: '0123456789',
            accountName: 'Amara Okonkwo',
            accountType: 'SAVINGS',
            status: 'ACTIVE',
            currencyCode: 'NGN',
            availableBalance: 125000,
            ledgerBalance: 125000,
            openedDate: '2024-01-16',
          },
        ]),
      ),
    ),
    http.get('/api/v1/loans/customer/:id', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/cards/customer/:id', () =>
      HttpResponse.json(
        wrap([
          {
            id: 7,
            cardNumberMasked: '5061********1234',
            cardScheme: 'VERVE',
            cardType: 'DEBIT',
            status: 'ACTIVE',
            expiryDate: '12/29',
            currencyCode: 'NGN',
          },
        ]),
      ),
    ),
    http.get('/api/v1/cases/customer/:id', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/customers/:id/identifications', () =>
      HttpResponse.json(
        wrap([
          {
            id: 100,
            idType: 'BVN',
            idNumber: '12345678901',
            isVerified: true,
            expiryDate: '2030-01-01',
            verifiedAt: '2024-01-15T10:00:00Z',
          },
        ]),
      ),
    ),
    http.get('/api/v1/customers/:id/transactions', () =>
      HttpResponse.json(
        wrap([
          {
            id: 20,
            transactionRef: 'TXN-001',
            transactionType: 'CREDIT',
            amount: 50000,
            currencyCode: 'NGN',
            narration: 'Opening deposit',
            createdAt: '2024-01-16T09:30:00Z',
            status: 'COMPLETED',
            accountNumber: '0123456789',
          },
        ]),
      ),
    ),
    http.get('/api/v1/notifications/customer/:id', () =>
      HttpResponse.json(
        wrap([
          {
            id: 30,
            channel: 'EMAIL',
            subject: 'Welcome to CBS',
            status: 'SENT',
            sentAt: '2024-01-16T10:00:00Z',
            templateCode: 'WELCOME',
          },
        ]),
      ),
    ),
    http.get('/api/v1/audit/entity/CUSTOMER/:id', () =>
      HttpResponse.json(
        wrap([
          {
            id: 40,
            action: 'CUSTOMER_CREATED',
            performedBy: 'system',
            eventTimestamp: '2024-01-15T10:00:00Z',
            description: 'Customer created',
          },
        ]),
      ),
    ),
  );
}

function renderPage(customerId = '1') {
  return renderWithProviders(
    <Routes>
      <Route path="/customers/:id" element={<Customer360Page />} />
    </Routes>,
    { route: `/customers/${customerId}` },
  );
}

describe('Customer360Page', () => {
  it('renders the live header and overview content', async () => {
    setupHandlers();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    expect(screen.getByText('CIF0000001')).toBeInTheDocument();
    expect(screen.getByText('HQ01')).toBeInTheDocument();
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('KYC Status')).toBeInTheDocument();
    expect(screen.getByText('Risk Profile')).toBeInTheDocument();
    expect(screen.queryByText('Issue Card')).not.toBeInTheDocument();
  });

  it('shows the error state when the customer cannot be loaded', async () => {
    setupHandlers();

    renderPage('999');

    await waitFor(() => {
      expect(screen.getByText(/customer not found or failed to load/i)).toBeInTheDocument();
    });
  });

  it('loads account data from the live customer accounts endpoint', async () => {
    setupHandlers();

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Accounts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Accounts'));

    await waitFor(() => {
      expect(screen.getByText('0123456789')).toBeInTheDocument();
      expect(screen.getAllByText('Amara Okonkwo').length).toBeGreaterThan(1);
    });
  });

  it('loads customer documents and shows the unsupported upload notice', async () => {
    setupHandlers();

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Documents'));

    await waitFor(() => {
      expect(screen.getByText(/document upload is not exposed by the current backend contract/i)).toBeInTheDocument();
      expect(screen.getAllByText('BVN').length).toBeGreaterThan(0);
    });
  });

  it('loads communications and shows the unsupported outbound action notice', async () => {
    setupHandlers();

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Communications')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Communications'));

    await waitFor(() => {
      expect(screen.getByText(/messaging actions are unavailable until the backend exposes an outbound communications endpoint/i)).toBeInTheDocument();
      expect(screen.getByText('Welcome to CBS')).toBeInTheDocument();
    });
  });

  it('loads transactions from the live customer transactions endpoint', async () => {
    setupHandlers();

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Transactions')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Transactions'));

    await waitFor(() => {
      expect(screen.getByText('TXN-001')).toBeInTheDocument();
      expect(screen.getByText('Opening deposit')).toBeInTheDocument();
    });
  });
});
