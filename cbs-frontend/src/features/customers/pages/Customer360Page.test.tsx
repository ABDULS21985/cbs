import { describe, it, expect, beforeEach } from 'vitest';
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
    // ── Core customer ──────────────────────────────────────────────────────
    http.get('/api/v1/customers/:id', ({ params }) => {
      if (params.id === '999') {
        return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
      }
      return HttpResponse.json(wrap(mockCustomer));
    }),

    // ── Customer 360 intelligence sub-resources ────────────────────────────
    http.get('/api/v1/customers/:id/health-score', () =>
      HttpResponse.json(
        wrap({
          totalScore: 78,
          grade: 'GOOD',
          factors: [],
          computedAt: new Date().toISOString(),
        }),
      ),
    ),
    http.get('/api/v1/customers/:id/relationships/graph', () =>
      HttpResponse.json(wrap({ nodes: [], edges: [] })),
    ),
    http.get('/api/v1/customers/:id/recommendations', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/customers/:id/timeline', () =>
      HttpResponse.json(wrap([])),
    ),

    // ── Accounts, loans, cards, cases ─────────────────────────────────────
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

    // ── Documents (identifications) ────────────────────────────────────────
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

    // ── Transactions ───────────────────────────────────────────────────────
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

    // ── Notifications / communications ─────────────────────────────────────
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
    http.get('/api/v1/notifications/preferences/:id', () =>
      HttpResponse.json(wrap([])),
    ),
    http.get('/api/v1/notifications/unread-count', () =>
      HttpResponse.json(wrap({ unreadCount: 0 })),
    ),

    // ── Audit trail ────────────────────────────────────────────────────────
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
  beforeEach(() => {
    setupHandlers();
  });

  it('renders the live header and overview content', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Amara Okonkwo')).toBeInTheDocument();
    });

    expect(screen.getByText('CIF0000001')).toBeInTheDocument();
    expect(screen.getByText('HQ01')).toBeInTheDocument();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('KYC Status')).toBeInTheDocument();
    expect(screen.getByText('Risk Profile')).toBeInTheDocument();
    expect(screen.queryByText('Issue Card')).not.toBeInTheDocument();
  });

  it('shows the error state when the customer cannot be loaded', async () => {
    renderPage('999');

    await waitFor(() => {
      expect(screen.getByText('Customer not found')).toBeInTheDocument();
    });
  });

  it('loads account data from the live customer accounts endpoint', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /accounts/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /accounts/i }));

    await waitFor(() => {
      expect(screen.getByText('0123456789')).toBeInTheDocument();
      expect(screen.getAllByText('Amara Okonkwo').length).toBeGreaterThan(1);
    });
  });

  it('loads customer documents tab and shows identification records', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /documents/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /documents/i }));

    await waitFor(() => {
      expect(screen.getAllByText('BVN').length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument();
  });

  it('loads communications history and shows sent messages', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /communications/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /communications/i }));

    await waitFor(() => {
      expect(screen.getByText('Welcome to CBS')).toBeInTheDocument();
    });
  });

  it('loads transactions from the live customer transactions endpoint', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /transactions/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /transactions/i }));

    await waitFor(() => {
      expect(screen.getByText('TXN-001')).toBeInTheDocument();
      expect(screen.getByText('Opening deposit')).toBeInTheDocument();
    });
  });
});
