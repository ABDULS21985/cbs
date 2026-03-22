import { http, HttpResponse } from 'msw';

const ts = () => new Date().toISOString();
const ok = <T>(data: T, page?: object) =>
  HttpResponse.json({ success: true, data, ...(page ? { page } : {}), timestamp: ts() });

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const mockDspmSource = {
  id: 1,
  sourceCode: 'DS-ABCDE12345',
  sourceName: 'Core Banking PostgreSQL',
  sourceType: 'DATABASE',
  connectionRef: 'jdbc:postgresql://db-host:5432/cbs',
  environment: 'PRODUCTION',
  owner: 'DBA Team',
  classification: 'CONFIDENTIAL',
  sensitivityLevel: 'HIGH',
  tags: ['pii', 'financial'],
  lastScanAt: '2024-03-10T08:30:00Z',
  recordCount: '5000000', // serialised as string by @JsonSerialize(ToStringSerializer)
  piiFieldsCount: 42,
  status: 'ACTIVE',
};

export const mockDspmScan = {
  id: 1,
  scanCode: 'SCN-ABCDE12345',
  scanType: 'FULL',
  scope: 'ALL',
  assetTypes: ['PII', 'FINANCIAL'],
  fullScan: true,
  triggeredBy: 'admin',
  sourceId: 1,
  totalAssets: 120,
  assetsScanned: 120,
  issuesFound: 7,
  criticalFindings: 1,
  highFindings: 2,
  mediumFindings: 3,
  lowFindings: 1,
  startedAt: '2024-03-10T08:00:00Z',
  completedAt: '2024-03-10T08:30:00Z',
  durationSec: 1800,
  status: 'COMPLETED',
};

export const mockInProgressScan = {
  ...mockDspmScan,
  id: 2,
  scanCode: 'SCN-INPROGRESS',
  status: 'IN_PROGRESS',
  completedAt: null,
  durationSec: 0,
  issuesFound: 0,
};

export const mockDspmPolicy = {
  id: 1,
  policyCode: 'POL-ABCDE12345',
  policyName: 'Block PII Export',
  policyType: 'DATA_MOVEMENT',
  description: 'Blocks unauthorized PII data exports',
  severity: 'CRITICAL',
  rule: { logic: 'AND', conditions: [{ field: 'contains_pii', operator: 'equals', value: 'true' }] },
  dataTypes: ['PII'],
  appliesTo: [],
  enforcementAction: 'BLOCK',
  autoRemediate: false,
  violationCount: 3,
  lastTriggeredAt: '2024-03-09T14:00:00Z',
  status: 'ACTIVE',
};

export const mockDraftPolicy = {
  ...mockDspmPolicy,
  id: 2,
  policyCode: 'POL-DRAFT12345',
  policyName: 'Encrypt PCI Data',
  status: 'DRAFT',
  violationCount: 0,
};

export const mockDspmException = {
  id: 1,
  exceptionCode: 'EXC-ABCDE12345',
  policyId: 1,
  sourceId: 1,
  exceptionType: 'TEMPORARY_WAIVER',
  reason: 'Migration in progress — temporary access granted',
  riskAccepted: true,
  approvedBy: 'Admin User',
  approvedAt: '2024-03-05T10:00:00Z',
  expiresAt: '2024-04-05T00:00:00Z',
  status: 'APPROVED',
};

export const mockPendingException = {
  ...mockDspmException,
  id: 2,
  exceptionCode: 'EXC-PENDING1234',
  status: 'PENDING',
  approvedBy: null,
  approvedAt: null,
};

export const mockDspmIdentity = {
  id: 1,
  identityCode: 'IDN-ABCDE12345',
  identityName: 'John Smith',
  identityType: 'USER',
  email: 'john.smith@cbs.bank',
  department: 'Finance',
  role: 'Analyst',
  accessLevel: 'READ',
  dataSourcesCount: 3,
  lastAccessAt: '2024-03-10T09:15:00Z',
  riskScore: 45.5,
  status: 'ACTIVE',
};

export const mockHighRiskIdentity = {
  ...mockDspmIdentity,
  id: 2,
  identityCode: 'IDN-HIGHRISK123',
  identityName: 'Service Account ETL',
  identityType: 'SERVICE_ACCOUNT',
  riskScore: 85.0,
  accessLevel: 'WRITE',
};

export const mockDspmAudit = {
  id: 1,
  auditCode: 'AUD-ABCDE12345',
  identityId: 1,
  sourceId: 1,
  action: 'SELECT',
  resourcePath: '/tables/customer/pii',
  queryText: 'SELECT * FROM customer WHERE id = ?',
  recordsAffected: 1,
  sensitiveFields: ['ssn', 'date_of_birth'],
  ipAddress: '10.0.0.45',
  userAgent: 'JDBC/4.2',
  outcome: 'SUCCESS',
  riskFlag: true,
  policyId: 1,
  occurredAt: '2024-03-10T09:15:00Z',
  createdAt: '2024-03-10T09:15:01Z',
};

const pageMeta = (total: number, page = 0, size = 20) => ({
  page,
  size,
  totalElements: total,
  totalPages: Math.ceil(total / size),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

export const dspmHandlers = [
  // Data Sources
  http.get('/api/v1/dspm/sources', () =>
    ok([mockDspmSource]),
  ),
  http.post('/api/v1/dspm/sources', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({ ...mockDspmSource, ...body, sourceCode: 'DS-NEWTEST1234', id: 99 }, undefined);
  }),
  http.get('/api/v1/dspm/sources/:code', ({ params }) =>
    ok({ ...mockDspmSource, sourceCode: params.code }),
  ),

  // Scans
  http.get('/api/v1/dspm/scans', () =>
    ok([mockDspmScan, mockInProgressScan]),
  ),
  http.post('/api/v1/dspm/scans', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({
      ...mockInProgressScan,
      id: 99,
      scanCode: 'SCN-NEWTEST1234',
      scope: body.scope ?? 'ALL',
      assetTypes: body.assetTypes ?? [],
      fullScan: body.fullScan ?? false,
      sourceId: body.sourceId ?? null,
    });
  }),
  http.post('/api/v1/dspm/scans/:code/complete', ({ request, params }) => {
    const url = new URL(request.url);
    const issuesFound = Number(url.searchParams.get('issuesFound') ?? 0);
    return ok({
      ...mockDspmScan,
      scanCode: params.code,
      status: 'COMPLETED',
      issuesFound,
      completedAt: ts(),
    });
  }),

  // Policies
  http.get('/api/v1/dspm/policies', () =>
    ok([mockDspmPolicy, mockDraftPolicy]),
  ),
  http.post('/api/v1/dspm/policies', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({ ...mockDraftPolicy, ...body, policyCode: 'POL-NEWTEST1234', id: 99 });
  }),
  http.put('/api/v1/dspm/policies/:code', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({ ...mockDspmPolicy, ...body, policyCode: params.code });
  }),
  http.post('/api/v1/dspm/policies/:code/activate', ({ params }) =>
    ok({ ...mockDraftPolicy, policyCode: params.code, status: 'ACTIVE' }),
  ),

  // Exceptions
  http.get('/api/v1/dspm/exceptions', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    let data = [mockDspmException, mockPendingException];
    if (status) data = data.filter(e => e.status === status);
    return ok(data, pageMeta(data.length));
  }),
  http.post('/api/v1/dspm/exceptions', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({ ...mockPendingException, ...body, exceptionCode: 'EXC-NEWTEST1234', id: 99 });
  }),
  http.post('/api/v1/dspm/exceptions/:code/approve', ({ request, params }) => {
    const url = new URL(request.url);
    const approvedBy = url.searchParams.get('approvedBy') ?? 'admin';
    return ok({ ...mockPendingException, exceptionCode: params.code, status: 'APPROVED', approvedBy, approvedAt: ts() });
  }),
  http.post('/api/v1/dspm/exceptions/:code/reject', ({ params }) =>
    ok({ ...mockPendingException, exceptionCode: params.code, status: 'REJECTED' }),
  ),

  // Identities
  http.get('/api/v1/dspm/identities', () =>
    ok([mockDspmIdentity, mockHighRiskIdentity]),
  ),
  http.get('/api/v1/dspm/identities/:code', ({ params }) =>
    ok({ ...mockDspmIdentity, identityCode: params.code }),
  ),
  http.post('/api/v1/dspm/identities', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({ ...mockDspmIdentity, ...body, identityCode: 'IDN-NEWTEST1234', id: 99 });
  }),

  // Access Audit
  http.get('/api/v1/dspm/identities/:code/audit', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    return ok([mockDspmAudit], pageMeta(1, page, 20));
  }),
  http.get('/api/v1/dspm/audit', () =>
    ok([mockDspmAudit]),
  ),
  http.post('/api/v1/dspm/audit', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return ok({ ...mockDspmAudit, ...body, auditCode: 'AUD-NEWTEST1234', id: 99 });
  }),
];
