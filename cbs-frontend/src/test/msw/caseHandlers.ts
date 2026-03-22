import { http, HttpResponse } from 'msw';
import {
  createMockCase,
  createMockCaseStats,
  createMockCaseNote,
  createMockCaseAttachment,
  createMockRca,
  createMockRcaDashboard,
  createMockRecurringRootCause,
  createMockPatternInsight,
} from '../factories/caseFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCases = Array.from({ length: 5 }, (_, i) =>
  createMockCase({
    id: i + 1,
    caseNumber: `CASE-${String(i + 1).padStart(6, '0')}`,
    customerName: `Customer ${i + 1}`,
    status: i === 0 ? 'OPEN' : i === 1 ? 'IN_PROGRESS' : i === 2 ? 'ESCALATED' : i === 3 ? 'RESOLVED' : 'CLOSED',
    priority: i === 0 ? 'CRITICAL' : i === 1 ? 'HIGH' : 'MEDIUM',
    slaBreached: i === 2,
    assignedTo: i < 3 ? 'agent-1' : i === 3 ? 'agent-2' : undefined,
    assignedToName: i < 3 ? 'Agent One' : i === 3 ? 'Agent Two' : undefined,
  })
);

export const caseHandlers = [
  // ── Case CRUD ────────────────────────────────────────────
  http.get('/api/v1/cases', () => HttpResponse.json(wrap(mockCases))),

  http.get('/api/v1/cases/stats', () => HttpResponse.json(wrap(createMockCaseStats()))),

  http.get('/api/v1/cases/my', () =>
    HttpResponse.json(wrap(mockCases.filter((c) => c.assignedTo === 'agent-1')))
  ),

  http.get('/api/v1/cases/unassigned', () =>
    HttpResponse.json(wrap(mockCases.filter((c) => !c.assignedTo)))
  ),

  http.get('/api/v1/cases/escalated', () =>
    HttpResponse.json(wrap(mockCases.filter((c) => c.status === 'ESCALATED')))
  ),

  http.get('/api/v1/cases/sla-breached', () =>
    HttpResponse.json(wrap(mockCases.filter((c) => c.slaBreached)))
  ),

  http.get('/api/v1/cases/customer/:customerId', ({ params }) =>
    HttpResponse.json(wrap(mockCases.filter((c) => c.customerId === Number(params.customerId))))
  ),

  http.get('/api/v1/cases/:caseNumber', ({ params }) => {
    const found = mockCases.find((c) => c.caseNumber === params.caseNumber || String(c.id) === params.caseNumber);
    if (!found) {
      return HttpResponse.json(wrap(createMockCase({ caseNumber: params.caseNumber as string })));
    }
    return HttpResponse.json(wrap(found));
  }),

  http.post('/api/v1/cases', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCase({ ...body, caseNumber: 'CASE-NEW001', status: 'OPEN' })), { status: 201 });
  }),

  http.put('/api/v1/cases/:caseNumber', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCase({ caseNumber: params.caseNumber as string, ...body })));
  }),

  // ── Case Actions ─────────────────────────────────────────
  http.post('/api/v1/cases/:caseNumber/assign', async ({ params, request }) => {
    const url = new URL(request.url);
    const assignedTo = url.searchParams.get('assignedTo') ?? 'assigned-agent';
    const team = url.searchParams.get('team') ?? undefined;
    return HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      status: 'IN_PROGRESS',
      assignedTo,
      assignedToName: assignedTo,
      assignedTeam: team,
    })));
  }),

  http.post('/api/v1/cases/:caseNumber/escalate', ({ params, request }) => {
    const url = new URL(request.url);
    const escalateTo = url.searchParams.get('escalateTo') ?? 'manager';
    return HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      status: 'ESCALATED',
      priority: 'CRITICAL',
      escalatedTo: escalateTo,
    })));
  }),

  http.post('/api/v1/cases/:caseNumber/resolve', ({ params, request }) => {
    const url = new URL(request.url);
    const resolutionType = url.searchParams.get('resolutionType') ?? 'FULLY_RESOLVED';
    const summary = url.searchParams.get('summary') ?? '';
    return HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      status: 'RESOLVED',
      resolutionType,
      resolution: summary,
      resolvedAt: new Date().toISOString(),
    })));
  }),

  http.post('/api/v1/cases/:caseNumber/close', ({ params }) =>
    HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
    })))
  ),

  // ── Notes & Attachments ──────────────────────────────────
  http.post('/api/v1/cases/:caseNumber/notes', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCaseNote(body)), { status: 201 });
  }),

  http.post('/api/v1/cases/:caseNumber/attachments', () =>
    HttpResponse.json(wrap(createMockCaseAttachment()), { status: 201 })
  ),

  http.get('/api/v1/cases/:caseNumber/attachments/:id/download', () =>
    new HttpResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="doc.pdf"' },
    })
  ),

  // ── Compensation ─────────────────────────────────────────
  http.post('/api/v1/cases/:caseNumber/compensation', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      compensationAmount: body.amount,
      compensationApproved: null,
    })));
  }),

  http.post('/api/v1/cases/:caseNumber/compensation/approve', ({ params }) =>
    HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      compensationAmount: 50000,
      compensationApproved: true,
      compensationApprovedBy: 'admin',
      compensationApprovedAt: new Date().toISOString(),
    })))
  ),

  http.post('/api/v1/cases/:caseNumber/compensation/reject', ({ params, request }) => {
    const url = new URL(request.url);
    const reason = url.searchParams.get('reason') ?? 'Insufficient justification';
    return HttpResponse.json(wrap(createMockCase({
      caseNumber: params.caseNumber as string,
      compensationAmount: 50000,
      compensationApproved: false,
      compensationRejectionReason: reason,
    })));
  }),

  // ── Root Cause Analysis ──────────────────────────────────
  http.post('/api/v1/root-cause-analysis', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockRca(body)), { status: 201 });
  }),

  http.get('/api/v1/root-cause-analysis/:code', ({ params }) =>
    HttpResponse.json(wrap(createMockRca({ rcaCode: params.code as string })))
  ),

  http.get('/api/v1/root-cause-analysis/case/:caseId', () =>
    HttpResponse.json(wrap([]))
  ),

  http.post('/api/v1/root-cause-analysis/:code/corrective-action', ({ params }) =>
    HttpResponse.json(wrap(createMockRca({
      rcaCode: params.code as string,
      correctiveActions: { action_1: { action: 'Fix issue', owner: 'Ops', dueDate: '2026-04-01', priority: 'HIGH', status: 'PENDING' } },
    })))
  ),

  http.post('/api/v1/root-cause-analysis/:code/complete', ({ params }) =>
    HttpResponse.json(wrap(createMockRca({ rcaCode: params.code as string, status: 'COMPLETED' })))
  ),

  http.post('/api/v1/root-cause-analysis/:code/validate', ({ params }) =>
    HttpResponse.json(wrap(createMockRca({ rcaCode: params.code as string, status: 'VALIDATED' })))
  ),

  http.get('/api/v1/root-cause-analysis/patterns', () =>
    HttpResponse.json(wrap([createMockPatternInsight()]))
  ),

  http.post('/api/v1/root-cause-analysis/patterns', () =>
    HttpResponse.json(wrap([createMockPatternInsight()]))
  ),

  http.get('/api/v1/root-cause-analysis/recurring', () =>
    HttpResponse.json(wrap([
      createMockRecurringRootCause(),
      createMockRecurringRootCause({ category: 'PROCESS', subCategory: 'Inadequate Validation', occurrenceCount: 8, affectedCases: 7, trend: 'STABLE' }),
    ]))
  ),

  http.get('/api/v1/root-cause-analysis/dashboard', () =>
    HttpResponse.json(wrap(createMockRcaDashboard()))
  ),
];
