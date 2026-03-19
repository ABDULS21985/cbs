import { http, HttpResponse } from 'msw';
import { createMockAccount, createMockAccountList } from '../factories/accountFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const accountHandlers = [
  http.get('/api/v1/accounts', () => HttpResponse.json(wrap(createMockAccountList(10)))),
  http.get('/api/v1/accounts/:id', ({ params }) => HttpResponse.json(wrap(createMockAccount({ id: Number(params.id) })))),
  http.post('/api/v1/accounts', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockAccount(body)), { status: 201 });
  }),
  http.get('/api/v1/accounts/:id/transactions', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/accounts/my', () => HttpResponse.json(wrap(createMockAccountList(3)))),
  http.get('/api/v1/products', () => HttpResponse.json(wrap([
    { id: 1, code: 'SAV-001', name: 'Savings Account', type: 'SAVINGS', currency: 'NGN', status: 'ACTIVE' },
    { id: 2, code: 'CUR-001', name: 'Current Account', type: 'CURRENT', currency: 'NGN', status: 'ACTIVE' },
  ]))),
];
