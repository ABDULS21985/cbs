import { http, HttpResponse } from 'msw';
import { createMockLoan, createMockLoanApplication, createMockScheduleItem } from '../factories/loanFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const loanHandlers = [
  http.get('/api/v1/loans', () => HttpResponse.json(wrap(Array.from({ length: 5 }, (_, i) => createMockLoan({ id: i + 1 }))))),
  http.get('/api/v1/loans/:id', ({ params }) => HttpResponse.json(wrap(createMockLoan({ id: Number(params.id) })))),
  http.get('/api/v1/loans/:id/schedule', () => HttpResponse.json(wrap(Array.from({ length: 12 }, (_, i) => createMockScheduleItem(i + 1))))),
  http.get('/api/v1/loans/:id/payments', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/loans/applications', () => HttpResponse.json(wrap(Array.from({ length: 5 }, (_, i) => createMockLoanApplication({ id: i + 1 }))))),
  http.post('/api/v1/loans/apply', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockLoanApplication(body)), { status: 201 });
  }),
  http.post('/api/v1/loans/:id/repay', () => HttpResponse.json(wrap({ id: 1, transactionRef: 'RPY-001', amount: 466667, status: 'SUCCESSFUL' }))),
  http.get('/api/v1/loans/portfolio/stats', () => HttpResponse.json(wrap({
    totalOutstanding: 12300000000, activeLoans: 3456, activeLoansChange: 2.1, nplRatio: 3.8, disbursedMtd: 890000000, collectionsMtd: 1100000000,
  }))),
];
