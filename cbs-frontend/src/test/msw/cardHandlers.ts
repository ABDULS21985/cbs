import { http, HttpResponse } from 'msw';
import { createMockCard } from '../factories/cardFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const cardHandlers = [
  // Core card endpoints
  http.get('/api/v1/cards', () => HttpResponse.json(wrap(Array.from({ length: 5 }, (_, i) => createMockCard({ id: i + 1 }))))),
  http.get('/api/v1/cards/:id', ({ params }) => HttpResponse.json(wrap(createMockCard({ id: Number(params.id) })))),
  http.post('/api/v1/cards', () => HttpResponse.json(wrap(createMockCard()))),
  http.post('/api/v1/cards/request', () => HttpResponse.json(wrap(createMockCard()))),
  http.post('/api/v1/cards/:id/block', () => HttpResponse.json(wrap(null))),
  http.post('/api/v1/cards/:id/activate', () => HttpResponse.json(wrap(null))),
  http.post('/api/v1/cards/:id/hotlist', () => HttpResponse.json(wrap(null))),
  http.patch('/api/v1/cards/:id/controls', () => HttpResponse.json(wrap(null))),
  http.get('/api/v1/cards/:id/transactions', () => HttpResponse.json(wrap([]))),

  // Card switch / transactions
  http.get('/api/v1/card-switch', () => HttpResponse.json(wrap([]))),

  // Merchants
  http.get('/api/v1/merchants', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/merchants/:id', () => HttpResponse.json(wrap(null))),
  http.post('/api/v1/merchants', () => HttpResponse.json(wrap(null))),
  http.post('/api/v1/merchants/:id/suspend', () => HttpResponse.json(wrap(null))),
  http.post('/api/v1/merchants/:id/activate', () => HttpResponse.json(wrap(null))),

  // POS terminals
  http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap([]))),

  // Card networks
  http.get('/api/v1/card-networks', () => HttpResponse.json(wrap([]))),
  http.post('/api/v1/card-networks', () => HttpResponse.json(wrap(null))),

  // Disputes
  http.get('/api/v1/cards/disputes/dashboard', () => HttpResponse.json(wrap({ initiated: 0, investigation: 0, chargebackFiled: 0, representment: 0, arbitration: 0 }))),
  http.get('/api/v1/cards/disputes/status/:status', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/cards/disputes/customer/:id', () => HttpResponse.json(wrap([]))),
  http.post('/api/v1/cards/disputes/sla-check', () => HttpResponse.json(wrap(null))),

  // Tokens
  http.get('/api/v1/cards/tokens/card/:id', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/cards/tokens/customer/:id', () => HttpResponse.json(wrap([]))),
];
