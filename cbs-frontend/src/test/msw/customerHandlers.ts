import { http, HttpResponse } from 'msw';
import { createMockCustomer, createMockCustomerList } from '../factories/customerFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });
const countPayload = { total: 50, active: 40, dormant: 8, suspended: 1, closed: 1, newMtd: 5 };

export const customerHandlers = [
  http.get('/api/v1/customers', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 0);
    const size = Number(url.searchParams.get('size') || 20);
    const customers = createMockCustomerList(size);
    return HttpResponse.json({ ...wrap(customers), page: { page, size, totalElements: 50, totalPages: 3 } });
  }),
  http.get('/api/v1/customers/:id', ({ params }) => {
    return HttpResponse.json(wrap(createMockCustomer({ id: Number(params.id) })));
  }),
  http.get('/api/v1/customers/count', () => {
    return HttpResponse.json(wrap(countPayload));
  }),
  http.post('/api/v1/customers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCustomer(body)), { status: 201 });
  }),
  http.get('/api/v1/accounts/customer/:id', () => {
    return HttpResponse.json(wrap([]));
  }),
  http.get('/api/v1/customers/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const results = createMockCustomerList(3).map(c => ({ ...c, fullName: `${q} Match` }));
    return HttpResponse.json(wrap(results));
  }),
];
