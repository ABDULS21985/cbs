import { http, HttpResponse } from 'msw';
import { createMockCard } from '../factories/cardFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const cardHandlers = [
  http.get('/api/v1/cards', () => HttpResponse.json(wrap(Array.from({ length: 5 }, (_, i) => createMockCard({ id: i + 1 }))))),
  http.get('/api/v1/cards/:id', ({ params }) => HttpResponse.json(wrap(createMockCard({ id: Number(params.id) })))),
  http.post('/api/v1/cards/:id/block', () => HttpResponse.json(wrap(null))),
  http.post('/api/v1/cards/:id/controls', () => HttpResponse.json(wrap(null))),
  http.get('/api/v1/card-switch', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/merchants', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/pos-terminals', () => HttpResponse.json(wrap([]))),
];
