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
  http.get('/api/v1/cases/metadata', () => HttpResponse.json(wrap({
    caseTypes: [
      { value: 'COMPLAINT', label: 'Complaint', category: 'GENERAL', subCategories: ['Service Quality', 'Charges/Fees', 'Account Issues', 'Card Issues', 'ATM/POS', 'Online Banking', 'Staff Behaviour'] },
      { value: 'SERVICE_REQUEST', label: 'Service Request', category: 'GENERAL', subCategories: ['Account Update', 'Card Request', 'Statement', 'Reference Letter', 'Cheque Book', 'Token/OTP'] },
      { value: 'INQUIRY', label: 'Inquiry', category: 'GENERAL', subCategories: ['Product Information', 'Balance Inquiry', 'Rate Inquiry', 'General'] },
      { value: 'DISPUTE', label: 'Dispute', category: 'PAYMENTS', subCategories: ['Transaction Dispute', 'Charge Dispute', 'Interest Dispute'] },
      { value: 'FRAUD_REPORT', label: 'Fraud Report', category: 'GENERAL', subCategories: ['Unauthorized Transaction', 'Phishing', 'Card Fraud', 'Identity Theft'] },
      { value: 'ACCOUNT_ISSUE', label: 'Account Issue', category: 'ACCOUNTS', subCategories: ['Account Lock', 'Account Update', 'Dormant Account', 'KYC Update'] },
      { value: 'PAYMENT_ISSUE', label: 'Payment Issue', category: 'PAYMENTS', subCategories: ['Failed Transfer', 'Delayed Payment', 'Wrong Beneficiary', 'Reversal'] },
      { value: 'CARD_ISSUE', label: 'Card Issue', category: 'CARDS', subCategories: ['Card Blocked', 'Card Replacement', 'PIN Reset', 'Card Activation'] },
      { value: 'LOAN_ISSUE', label: 'Loan Issue', category: 'LOANS', subCategories: ['Repayment Issue', 'Disbursement Delay', 'Interest Query', 'Early Settlement'] },
      { value: 'FEE_REVERSAL', label: 'Fee Reversal', category: 'FEES', subCategories: ['Maintenance Fee', 'SMS Fee', 'Transaction Fee', 'Penalty Fee'] },
      { value: 'DOCUMENT_REQUEST', label: 'Document Request', category: 'GENERAL', subCategories: ['Statement', 'Reference Letter', 'Audit Confirmation', 'Tax Certificate'] },
      { value: 'PRODUCT_CHANGE', label: 'Product Change', category: 'GENERAL', subCategories: ['Account Upgrade', 'Account Downgrade', 'Product Switch'] },
      { value: 'CLOSURE', label: 'Closure', category: 'ACCOUNTS', subCategories: ['Account Closure', 'Card Closure', 'Loan Closure'] },
      { value: 'REGULATORY', label: 'Regulatory', category: 'GENERAL', subCategories: ['CBN Directive', 'Compliance Issue', 'AML/CFT'] },
      { value: 'ESCALATION', label: 'Escalation', category: 'GENERAL', subCategories: ['Management Escalation', 'Regulatory Escalation', 'Ombudsman'] },
    ],
    priorities: ['MEDIUM', 'HIGH', 'LOW', 'CRITICAL'],
  }))),

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
