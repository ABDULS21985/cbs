import { http, HttpResponse } from 'msw';
import { adminHandlers } from './adminHandlers';
import { agreementHandlers } from './agreementHandlers';
import { dspmHandlers } from './dspmHandlers';
import { transactionHandlers } from './transactionHandlers';

export const mockUser = {
  id: 1, username: 'amara.officer', fullName: 'Amara Okonkwo',
  email: 'amara@cbs.bank', roles: ['CBS_OFFICER'], permissions: [],
  branchId: 1, branchName: 'Lagos Main', lastLogin: '2024-01-15T09:00:00Z',
};

export const mockCustomer = {
  id: 1,
  customerNumber: 'CUS-001',
  cifNumber: 'CIF0000001',
  fullName: 'Amara Okonkwo',
  email: 'amara@example.com',
  phone: '+2348012345678',
  phonePrimary: '+2348012345678',
  status: 'ACTIVE',
  kycStatus: 'VERIFIED',
  type: 'INDIVIDUAL',
  customerType: 'INDIVIDUAL',
  branchCode: 'HQ01',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  addresses: [],
  identifications: [],
  contacts: [],
  relationships: [],
  notes: [],
  version: 1,
};

export const mockAccount = {
  id: 1, accountNumber: '0123456789', accountName: 'Amara Okonkwo',
  accountType: 'SAVINGS', balance: 150000.0, availableBalance: 148000.0,
  currency: 'NGN', status: 'ACTIVE', customerId: 1, customerName: 'Amara Okonkwo',
};

export const handlers = [
  http.post('/api/v1/auth/login', () =>
    HttpResponse.json({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', expiresIn: 3600, user: mockUser, mfaRequired: false })
  ),
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token', expiresIn: 3600 })
  ),
  http.post('/api/v1/auth/logout', () => HttpResponse.json({ success: true })),
  http.get('/api/v1/customers', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    return HttpResponse.json({ success: true, data: [mockCustomer], page: { page, size: 10, totalElements: 1, totalPages: 1 }, timestamp: new Date().toISOString() });
  }),
  http.get('/api/v1/customers/:id', ({ params }) => {
    if (params.id === '999') return HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return HttpResponse.json({ success: true, data: mockCustomer, timestamp: new Date().toISOString() });
  }),
  http.get('/api/v1/customers/count', () =>
    HttpResponse.json({
      success: true,
      data: { total: 1, active: 1, dormant: 0, suspended: 0, closed: 0, newMtd: 1 },
      timestamp: new Date().toISOString(),
    })
  ),
  http.get('/api/v1/accounts/customer/:id', () =>
    HttpResponse.json({ success: true, data: [mockAccount], timestamp: new Date().toISOString() })
  ),
  http.get('/api/v1/customers/:id/identifications', () =>
    HttpResponse.json({ success: true, data: [], timestamp: new Date().toISOString() })
  ),
  http.get('/api/v1/notifications/customer/:id', () =>
    HttpResponse.json({ success: true, data: [], timestamp: new Date().toISOString() })
  ),
  http.get('/api/v1/audit/entity/CUSTOMER/:id', () =>
    HttpResponse.json({ success: true, data: [], timestamp: new Date().toISOString() })
  ),
  http.get('/api/v1/accounts', () =>
    HttpResponse.json({ success: true, data: [mockAccount], page: { page: 0, size: 10, totalElements: 1, totalPages: 1 }, timestamp: new Date().toISOString() })
  ),
  http.get('/api/v1/accounts/selector', () =>
    HttpResponse.json([{ id: 'acc-1', label: '0123456789 — Amara Okonkwo' }, { id: 'acc-2', label: '0234567890 — TechVentures Ltd' }])
  ),
  http.get('/api/v1/reports/custom/data-sources', () => HttpResponse.json([])),
  ...dspmHandlers,
  ...adminHandlers,
  ...agreementHandlers,
  ...transactionHandlers,
  http.get('/api/v1/*', () => HttpResponse.json({ success: true, data: [], timestamp: new Date().toISOString() })),
  http.post('/api/v1/*', () => HttpResponse.json({ success: true, data: {}, timestamp: new Date().toISOString() })),
  http.put('/api/v1/*', () => HttpResponse.json({ success: true, data: {}, timestamp: new Date().toISOString() })),
  http.patch('/api/v1/*', () => HttpResponse.json({ success: true, data: {}, timestamp: new Date().toISOString() })),
  http.delete('/api/v1/*', () => HttpResponse.json({ success: true, data: null, timestamp: new Date().toISOString() })),
];
