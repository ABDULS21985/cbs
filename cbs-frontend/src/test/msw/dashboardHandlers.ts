import { http, HttpResponse } from 'msw';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const dashboardHandlers = [
  http.get('/api/v1/dashboard/recent-transactions', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/dashboard/charts/monthly-volume', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/approvals/pending', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/customers', () => HttpResponse.json(wrap([]))),
];
