import { http, HttpResponse } from 'msw';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const adminHandlers = [
  http.get('/v1/admin/users', () => HttpResponse.json(wrap([]))),
  http.get('/v1/admin/roles', () => HttpResponse.json(wrap([]))),
  http.get('/v1/admin/permissions', () => HttpResponse.json(wrap([]))),
  http.get('/v1/admin/sessions', () => HttpResponse.json(wrap([]))),
  http.get('/v1/admin/login-history', () => HttpResponse.json(wrap([]))),
  http.get('/v1/admin/providers', () => HttpResponse.json(wrap([]))),
];
