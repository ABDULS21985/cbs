import { http, HttpResponse } from 'msw';
import { createMockTransfer, createMockStandingOrder } from '../factories/paymentFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const paymentHandlers = [
  http.post('/api/v1/payments/transfer', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockTransfer(body)), { status: 201 });
  }),
  http.get('/api/v1/payments/fee-preview', ({ request }) => {
    const url = new URL(request.url);
    const amount = Number(url.searchParams.get('amount') || 0);
    return HttpResponse.json(wrap({ transferFee: 52.50, vat: 3.94, totalFee: 56.44, totalDebit: amount + 56.44 }));
  }),
  http.post('/api/v1/payments/name-enquiry', () => HttpResponse.json(wrap({ accountNumber: '0987654321', accountName: 'CHIDI OKAFOR', bankCode: '044', bankName: 'Access Bank', verified: true }))),
  http.get('/api/v1/payments/recent', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/payments/check-duplicate', () => HttpResponse.json(wrap({ isDuplicate: false }))),
  http.get('/api/v1/beneficiaries', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/banks', () => HttpResponse.json(wrap([
    { code: '044', name: 'Access Bank' }, { code: '058', name: 'GTBank' }, { code: '011', name: 'First Bank' },
  ]))),
  http.get('/api/v1/standing-orders', () => HttpResponse.json(wrap(Array.from({ length: 3 }, (_, i) => createMockStandingOrder({ id: i + 1 }))))),
  http.get('/api/v1/standing-orders/:id', ({ params }) => HttpResponse.json(wrap(createMockStandingOrder({ id: Number(params.id) })))),
  http.get('/api/v1/standing-orders/:id/executions', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/bills/categories', () => HttpResponse.json(wrap([
    { code: 'electricity', name: 'Electricity', icon: 'zap', billerCount: 5 },
    { code: 'cable_tv', name: 'Cable TV', icon: 'tv', billerCount: 3 },
  ]))),
  http.get('/api/v1/bills/favorites', () => HttpResponse.json(wrap([]))),
];
