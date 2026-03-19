import { http, HttpResponse } from 'msw';
import { createMockAccountList } from '../factories/accountFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const portalHandlers = [
  http.get('/api/v1/portal/accounts', () => HttpResponse.json(wrap(createMockAccountList(2)))),
  http.get('/api/v1/portal/transactions/recent', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/portal/accounts/:id/transactions', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/portal/beneficiaries', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/portal/cards', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/portal/service-requests', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/portal/service-requests/types', () => HttpResponse.json(wrap(['Cheque Book Request', 'Statement Request', 'Card Replacement']))),
];
