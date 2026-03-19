import { http, HttpResponse } from 'msw';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const complianceHandlers = [
  http.get('/api/v1/compliance/stats', () => HttpResponse.json(wrap({ activeAssessments: 5, openGaps: 45, criticalGaps: 8, overdueRemediations: 12, complianceScore: 78 }))),
  http.get('/api/v1/compliance/assessments', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/compliance/gaps', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/compliance/policies', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/compliance/audit-findings', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/compliance/returns/stats', () => HttpResponse.json(wrap({ dueThisMonth: 12, pendingSubmission: 5, overdue: 1, submittedMtd: 7 }))),
  http.get('/api/v1/compliance/returns/calendar', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/compliance/returns', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/audit/search', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/audit/summary', () => HttpResponse.json(wrap({ totalResults: 0, creates: 0, updates: 0, deletes: 0, approvals: 0 }))),
];
