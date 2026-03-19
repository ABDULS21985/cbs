import { http, HttpResponse } from 'msw';
import { createMockCase, createMockCaseStats } from '../factories/caseFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const caseHandlers = [
  http.get('/api/v1/cases', () => HttpResponse.json(wrap(Array.from({ length: 5 }, (_, i) => createMockCase({ id: i + 1 }))))),
  http.get('/api/v1/cases/:id', ({ params }) => HttpResponse.json(wrap(createMockCase({ id: Number(params.id) })))),
  http.get('/api/v1/cases/stats', () => HttpResponse.json(wrap(createMockCaseStats()))),
  http.get('/api/v1/cases/my', () => HttpResponse.json(wrap(Array.from({ length: 3 }, (_, i) => createMockCase({ id: i + 1 }))))),
  http.get('/api/v1/cases/unassigned', () => HttpResponse.json(wrap([]))),
  http.post('/api/v1/cases', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCase(body)), { status: 201 });
  }),
  http.post('/api/v1/cases/:id/resolve', () => HttpResponse.json(wrap(createMockCase({ status: 'RESOLVED' })))),
  http.post('/api/v1/cases/:id/notes', () => HttpResponse.json(wrap({ id: 1, type: 'NOTE', content: 'Test note', createdBy: 'agent', createdAt: new Date().toISOString() }))),
];
