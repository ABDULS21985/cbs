import { http, HttpResponse } from 'msw';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const treasuryHandlers = [
  http.get('/api/v1/treasury/fixed-income/holdings', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/treasury/fixed-income/coupons', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/market-data/fx-rates', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/market-data/money-market', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/market-data/feeds/status', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/treasury/orders', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/treasury/confirmations', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/treasury/settlement-fails', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/capital-markets/deals', () => HttpResponse.json(wrap([]))),
];
