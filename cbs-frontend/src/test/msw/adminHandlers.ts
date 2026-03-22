import { http, HttpResponse } from 'msw';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockUsers = [
  {
    id: '1', username: 'amara.officer', fullName: 'Amara Okonkwo', email: 'amara@cbs.bank',
    phone: '+2348012345678', roles: ['CBS_OFFICER'], branchId: '1', branchName: 'Lagos Main',
    department: 'Operations', status: 'ACTIVE', lastLogin: '2024-01-15T09:00:00Z',
    createdAt: '2023-06-01T08:00:00Z', mfaEnabled: true,
  },
  {
    id: '2', username: 'chidinma.admin', fullName: 'Chidinma Eze', email: 'chidinma@cbs.bank',
    phone: '+2348023456789', roles: ['CBS_ADMIN'], branchId: '1', branchName: 'Lagos Main',
    department: 'IT', status: 'ACTIVE', lastLogin: '2024-01-15T08:30:00Z',
    createdAt: '2023-03-15T10:00:00Z', mfaEnabled: true,
  },
  {
    id: '3', username: 'emeka.teller', fullName: 'Emeka Nwosu', email: 'emeka@cbs.bank',
    phone: '+2348034567890', roles: ['CBS_TELLER'], branchId: '2', branchName: 'Abuja Branch',
    department: 'Branch Ops', status: 'LOCKED', lastLogin: '2024-01-10T14:00:00Z',
    createdAt: '2023-09-20T09:00:00Z', mfaEnabled: false,
  },
];

const mockRoles = [
  { id: 1, roleName: 'CBS_ADMIN', displayName: 'System Administrator', description: 'Full admin access', userCount: 5, permissionCount: 42, isSystem: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 2, roleName: 'CBS_OFFICER', displayName: 'Banking Officer', description: 'Standard officer access', userCount: 25, permissionCount: 18, isSystem: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 3, roleName: 'CBS_TELLER', displayName: 'Teller', description: 'Teller operations', userCount: 40, permissionCount: 10, isSystem: true, createdAt: '2023-01-01T00:00:00Z' },
  { id: 4, roleName: 'CBS_AUDITOR', displayName: 'Auditor', description: 'Read-only audit access', userCount: 3, permissionCount: 8, isSystem: false, createdAt: '2023-06-01T00:00:00Z' },
];

const mockPermissions = [
  { id: 1, permissionCode: 'CUSTOMER_READ', module: 'CUSTOMER', description: 'View customers', isSystem: true },
  { id: 2, permissionCode: 'CUSTOMER_WRITE', module: 'CUSTOMER', description: 'Create/edit customers', isSystem: true },
  { id: 3, permissionCode: 'ACCOUNT_READ', module: 'ACCOUNT', description: 'View accounts', isSystem: true },
  { id: 4, permissionCode: 'ACCOUNT_WRITE', module: 'ACCOUNT', description: 'Create/edit accounts', isSystem: true },
  { id: 5, permissionCode: 'TRANSACTION_APPROVE', module: 'TRANSACTION', description: 'Approve transactions', isSystem: true },
  { id: 6, permissionCode: 'ADMIN_FULL', module: 'ADMIN', description: 'Full admin access', isSystem: true },
];

const mockSessions = [
  { id: 1, userId: '1', username: 'amara.officer', ip: '192.168.1.10', userAgent: 'Chrome/120', startedAt: '2024-01-15T09:00:00Z', lastActivity: '2024-01-15T09:45:00Z' },
  { id: 2, userId: '2', username: 'chidinma.admin', ip: '192.168.1.20', userAgent: 'Firefox/121', startedAt: '2024-01-15T08:30:00Z', lastActivity: '2024-01-15T09:50:00Z' },
];

const mockLoginEvents = [
  { id: 1, username: 'amara.officer', outcome: 'SUCCESS', ip: '192.168.1.10', timestamp: '2024-01-15T09:00:00Z', userAgent: 'Chrome/120' },
  { id: 2, username: 'emeka.teller', outcome: 'FAILED', ip: '10.0.0.55', timestamp: '2024-01-15T08:55:00Z', userAgent: 'Safari/17' },
  { id: 3, username: 'chidinma.admin', outcome: 'SUCCESS', ip: '192.168.1.20', timestamp: '2024-01-15T08:30:00Z', userAgent: 'Firefox/121' },
];

const mockParameters = [
  { id: 1, paramKey: 'MAX_TRANSFER_LIMIT', paramCategory: 'TRANSACTION', paramValue: '5000000', dataType: 'DECIMAL', description: 'Maximum single transfer limit', isEncrypted: false, approvalStatus: 'APPROVED', lastModifiedBy: 'chidinma.admin', updatedAt: '2024-01-10T12:00:00Z' },
  { id: 2, paramKey: 'SESSION_TIMEOUT_MINUTES', paramCategory: 'SECURITY', paramValue: '30', dataType: 'INTEGER', description: 'Session idle timeout', isEncrypted: false, approvalStatus: 'APPROVED', lastModifiedBy: 'chidinma.admin', updatedAt: '2024-01-08T09:00:00Z' },
  { id: 3, paramKey: 'MFA_REQUIRED', paramCategory: 'SECURITY', paramValue: 'true', dataType: 'BOOLEAN', description: 'MFA required for all users', isEncrypted: false, approvalStatus: 'PENDING', lastModifiedBy: 'amara.officer', updatedAt: '2024-01-14T15:00:00Z' },
];

const mockDashboardStats = {
  totalUsers: 73,
  activeUsers: 68,
  lockedUsers: 3,
  disabledUsers: 2,
  activeProducts: 24,
  healthyProviders: 8,
  totalRoles: 4,
  totalPermissions: 42,
  activeSessions: 12,
};

const mockFeatureFlags = [
  { id: 1, flagKey: 'MOBILE_BANKING_V2', enabled: true, description: 'Enable new mobile banking UI', lastModifiedBy: 'admin' },
  { id: 2, flagKey: 'QR_PAYMENTS', enabled: false, description: 'QR code payment feature', lastModifiedBy: 'admin' },
];

const mockRateTables = [
  { id: 1, tableName: 'SAVINGS_INTEREST', effectiveDate: '2024-01-01', tiers: [{ min: 0, max: 500000, rate: 1.5 }, { min: 500001, max: 5000000, rate: 2.5 }] },
];

const mockLookupCodes = [
  { category: 'ACCOUNT_TYPE', codes: [{ code: 'SAVINGS', label: 'Savings Account' }, { code: 'CURRENT', label: 'Current Account' }] },
  { category: 'ID_TYPE', codes: [{ code: 'NIN', label: 'National ID' }, { code: 'BVN', label: 'Bank Verification Number' }] },
];

const mockSystemInfo = {
  version: '2.4.1', buildDate: '2024-01-15', environment: 'PRODUCTION', javaVersion: '21',
  database: 'PostgreSQL 16', uptime: '15d 4h 23m', memoryUsed: '2.1 GB', memoryMax: '4 GB',
};

// ─── Security Admin Mock Data ─────────────────────────────────────────────────

const mockSecurityOverview = {
  activeRoles: 4, totalPermissions: 42, abacPolicies: 6, activeMfaEnrollments: 45,
  activeKeys: 8, securityEvents: 320, unacknowledgedEvents: 12, criticalEvents: 2,
  siemRules: 15, maskingPolicies: 10,
};

const mockAbacPolicies = [
  { id: 1, policyName: 'Branch-Restricted Access', resource: 'CUSTOMER', action: 'READ', effect: 'ALLOW', priority: 1, isActive: true, description: 'Users can only view customers in their branch' },
  { id: 2, policyName: 'High-Value Approval', resource: 'TRANSACTION', action: 'APPROVE', effect: 'DENY', priority: 2, isActive: true, description: 'Deny approval for transactions above limit without dual auth' },
];

const mockMfaEnrollments = [
  { id: 1, userId: 1, mfaMethod: 'TOTP', isPrimary: true, isVerified: true, failureCount: 0, status: 'ACTIVE', lastUsedAt: '2024-01-15T09:00:00Z' },
  { id: 2, userId: 2, mfaMethod: 'SMS', isPrimary: true, isVerified: true, failureCount: 1, status: 'ACTIVE', lastUsedAt: '2024-01-15T08:30:00Z' },
];

const mockEncryptionKeys = [
  { id: 1, keyAlias: 'data-encryption-key-1', keyId: 'kms-001', keyType: 'SYMMETRIC', purpose: 'DATA_ENCRYPTION', algorithm: 'AES-256-GCM', keySizeBits: 256, status: 'ACTIVE', rotationIntervalDays: 90, createdAt: '2023-06-01T00:00:00Z' },
  { id: 2, keyAlias: 'token-signing-key', keyId: 'kms-002', keyType: 'ASYMMETRIC', purpose: 'TOKEN_SIGNING', algorithm: 'RSA-4096', keySizeBits: 4096, status: 'ACTIVE', rotationIntervalDays: 365, createdAt: '2023-01-01T00:00:00Z' },
];

const mockSecurityEvents = {
  content: [
    { id: 1, eventType: 'FAILED_LOGIN', eventCategory: 'AUTHENTICATION', severity: 'MEDIUM', username: 'emeka.teller', ipAddress: '10.0.0.55', actionTaken: 'ACCOUNT_LOCKED', threatScore: 45, isAcknowledged: false, createdAt: '2024-01-15T08:55:00Z' },
    { id: 2, eventType: 'PRIVILEGE_ESCALATION', eventCategory: 'AUTHORIZATION', severity: 'HIGH', username: 'unknown', ipAddress: '172.16.0.100', actionTaken: 'BLOCKED', threatScore: 85, isAcknowledged: false, createdAt: '2024-01-14T22:30:00Z' },
  ],
  totalElements: 2, totalPages: 1, page: 0, size: 30,
};

const mockSiemRules = [
  { id: 1, ruleName: 'Brute Force Detection', ruleType: 'THRESHOLD', timeWindowMinutes: 15, severityOutput: 'HIGH', actionOnTrigger: 'LOCK_ACCOUNT', isActive: true, description: 'Lock after 5 failed attempts in 15 min' },
  { id: 2, ruleName: 'Off-Hours Access', ruleType: 'ANOMALY', timeWindowMinutes: 60, severityOutput: 'MEDIUM', actionOnTrigger: 'ALERT', isActive: true, description: 'Alert on access outside business hours' },
];

const mockMaskingPolicies = [
  { id: 1, policyName: 'PII Masking', entityType: 'CUSTOMER', fieldName: 'phone', maskingStrategy: 'PARTIAL', maskPattern: '****####', appliesToRoles: ['CBS_TELLER'], isActive: true },
  { id: 2, policyName: 'Card Masking', entityType: 'CARD', fieldName: 'cardNumber', maskingStrategy: 'FULL', maskPattern: '**** **** **** ####', appliesToRoles: null, isActive: true },
];

const mockPiiRegistry = [
  { id: 1, entityType: 'CUSTOMER', fieldName: 'email', piiCategory: 'CONTACT', sensitivityLevel: 'HIGH', encryptionRequired: true, defaultMaskingStrategy: 'PARTIAL', retentionDays: 2555, gdprLawfulBasis: 'CONTRACT' },
  { id: 2, entityType: 'CUSTOMER', fieldName: 'phone', piiCategory: 'CONTACT', sensitivityLevel: 'HIGH', encryptionRequired: true, defaultMaskingStrategy: 'PARTIAL', retentionDays: 2555, gdprLawfulBasis: 'CONTRACT' },
];

// ─── Products Mock Data ───────────────────────────────────────────────────────

const mockProducts = [
  { id: 1, code: 'SAV-001', name: 'Basic Savings', type: 'SAVINGS', category: 'RETAIL', status: 'ACTIVE', shortDescription: 'Entry-level savings', activeAccounts: 12500, createdAt: '2023-01-01T00:00:00Z' },
  { id: 2, code: 'CUR-001', name: 'Premium Current', type: 'CURRENT', category: 'RETAIL', status: 'ACTIVE', shortDescription: 'Premium checking account', activeAccounts: 8200, createdAt: '2023-02-01T00:00:00Z' },
  { id: 3, code: 'FD-001', name: 'Fixed Deposit 12M', type: 'FIXED_DEPOSIT', category: 'RETAIL', status: 'DRAFT', shortDescription: '12-month fixed deposit', activeAccounts: 0, createdAt: '2024-01-10T00:00:00Z' },
];

const mockBundles = [
  { id: 1, name: 'Starter Bundle', description: 'Savings + Debit Card', products: [1], status: 'ACTIVE', feeDiscount: 15 },
];

// ─── Providers Mock Data ──────────────────────────────────────────────────────

const mockProviders = [
  { id: 1, providerCode: 'NIP', providerName: 'NIBSS Instant Payments', providerType: 'PAYMENT_GATEWAY', status: 'ACTIVE', healthStatus: 'HEALTHY', uptimePct: 99.95, avgResponseTimeMs: 180, slaResponseTimeMs: 300, lastHealthCheck: '2024-01-15T09:50:00Z' },
  { id: 2, providerCode: 'PAYSTACK', providerName: 'Paystack', providerType: 'PAYMENT_PROCESSOR', status: 'ACTIVE', healthStatus: 'HEALTHY', uptimePct: 99.8, avgResponseTimeMs: 220, slaResponseTimeMs: 500, lastHealthCheck: '2024-01-15T09:48:00Z' },
  { id: 3, providerCode: 'SMTP_SVC', providerName: 'Email Service', providerType: 'NOTIFICATION', status: 'ACTIVE', healthStatus: 'DEGRADED', uptimePct: 98.5, avgResponseTimeMs: 450, slaResponseTimeMs: 600, lastHealthCheck: '2024-01-15T09:45:00Z' },
];

const mockHealthLogs = [
  { id: 1, providerId: 1, checkTime: '2024-01-15T09:50:00Z', status: 'UP', responseTimeMs: 180, statusCode: 200 },
  { id: 2, providerId: 1, checkTime: '2024-01-15T09:45:00Z', status: 'UP', responseTimeMs: 195, statusCode: 200 },
];

const mockSlaRecords = [
  { providerCode: 'NIP', providerName: 'NIBSS Instant Payments', slaUptimePct: 99.9, actualUptimePct: 99.95, slaResponseTimeMs: 300, actualAvgResponseTimeMs: 180, slaMet: true },
  { providerCode: 'SMTP_SVC', providerName: 'Email Service', slaUptimePct: 99.5, actualUptimePct: 98.5, slaResponseTimeMs: 600, actualAvgResponseTimeMs: 450, slaMet: false },
];

const mockCostRecords = [
  { providerCode: 'NIP', providerName: 'NIBSS Instant Payments', pricingModel: 'PER_TRANSACTION', perTransactionFee: 7.5, monthlyCost: null, currentMonthVolume: 145000, monthlyVolumeLimit: 0, estimatedMonthlyCost: 1087500 },
  { providerCode: 'PAYSTACK', providerName: 'Paystack', pricingModel: 'PERCENTAGE', perTransactionFee: 0, monthlyCost: null, currentMonthVolume: 85000, monthlyVolumeLimit: 0, estimatedMonthlyCost: 425000 },
];

// ─── Notification Mock Data ───────────────────────────────────────────────────

const mockTemplates = [
  { id: 1, templateCode: 'TXN_ALERT', templateName: 'Transaction Alert', channel: 'SMS', status: 'PUBLISHED', version: 3, bodyTemplate: 'Txn of {{amount}} on {{account}}', createdAt: '2023-06-01T00:00:00Z' },
  { id: 2, templateCode: 'WELCOME_EMAIL', templateName: 'Welcome Email', channel: 'EMAIL', status: 'PUBLISHED', version: 1, bodyTemplate: 'Welcome to CBS, {{name}}!', createdAt: '2023-07-01T00:00:00Z' },
];

const mockChannelConfigs = [
  { channel: 'EMAIL', enabled: true, provider: 'SMTP', dailyLimit: 50000, currentDayUsage: 12345, rateLimitPerMinute: 500 },
  { channel: 'SMS', enabled: true, provider: 'TWILIO', dailyLimit: 100000, currentDayUsage: 34567, rateLimitPerMinute: 1000 },
  { channel: 'PUSH', enabled: true, provider: 'FCM', dailyLimit: 200000, currentDayUsage: 5000, rateLimitPerMinute: 2000 },
  { channel: 'IN_APP', enabled: true, provider: 'INTERNAL', dailyLimit: 0, currentDayUsage: 15000, rateLimitPerMinute: 0 },
];

const mockDeliveryStats = {
  total: 234567, sent: 230000, delivered: 225000, failed: 5000, pending: 4567,
  deliveryRatePct: 97.8, failureRatePct: 2.2,
};

const mockScheduledNotifications = [
  { id: 1, name: 'Monthly Statement Reminder', templateCode: 'STMT_REMINDER', cronExpression: '0 9 1 * *', status: 'ACTIVE', nextRun: '2024-02-01T09:00:00Z' },
];

// ─── Biller Mock Data ─────────────────────────────────────────────────────────

const mockBillers = [
  { id: 1, billerCode: 'EKEDC', billerName: 'Eko Electricity', billerCategory: 'UTILITY', currencyCode: 'NGN', flatFee: 100, percentageFee: 0, customerIdLabel: 'Meter Number', isActive: true, settlementBankCode: '044', settlementAccountNumber: '0123456789', feeBearer: 'CUSTOMER' },
  { id: 2, billerCode: 'MTN', billerName: 'MTN Nigeria', billerCategory: 'TELECOM', currencyCode: 'NGN', flatFee: 0, percentageFee: 1.5, customerIdLabel: 'Phone Number', isActive: true, settlementBankCode: '058', settlementAccountNumber: '9876543210', feeBearer: 'CUSTOMER' },
];

// ─── Campaigns, Loyalty, Pricing, etc. Mock Data ──────────────────────────────

const mockCampaigns = [
  { id: 1, campaignCode: 'CAMP-001', campaignName: 'New Year Savings Promo', campaignType: 'MULTI_CHANNEL', targetSegment: 'High-Value Retail', channel: 'Mobile App', startDate: '2024-01-01', endDate: '2024-01-31', budgetAmount: 5000000, sentCount: 15000, openedCount: 8500, convertedCount: 2300, status: 'ACTIVE' },
  { id: 2, campaignCode: 'CAMP-002', campaignName: 'SME Loan Drive', campaignType: 'EMAIL', targetSegment: 'SME Customers', channel: 'Email', startDate: '2024-02-01', endDate: '2024-02-28', budgetAmount: 2000000, sentCount: 0, openedCount: 0, convertedCount: 0, status: 'DRAFT' },
];

const mockLoyaltyPrograms = [
  { id: 1, programName: 'CBS Rewards', programType: 'POINTS', pointsCurrencyName: 'Points', earnRatePerUnit: 1, earnRateUnit: 1000, pointValue: 0.5, minRedemptionPoints: 500, expiryMonths: 24, isActive: true },
];

const mockLoyaltyAccounts = [
  { id: 1, loyaltyNumber: 'LYL-0001', customerId: 1, currentBalance: 15400, currentTier: 'GOLD', lifetimeEarned: 45000, lifetimeRedeemed: 29600, status: 'ACTIVE' },
  { id: 2, loyaltyNumber: 'LYL-0002', customerId: 2, currentBalance: 3200, currentTier: 'SILVER', lifetimeEarned: 8000, lifetimeRedeemed: 4800, status: 'ACTIVE' },
];

const mockDiscounts = [
  { id: 1, schemeName: 'Volume Transfer Discount', schemeType: 'VOLUME', discountBasis: 'PERCENTAGE', discountValue: 10, effectiveFrom: '2024-01-01', effectiveTo: '2024-12-31', currentUtilization: 450, status: 'ACTIVE' },
];

const mockSpecialPricing = [
  { id: 1, customerName: 'TechVentures Ltd', customerId: 100, agreementType: 'FEE_WAIVER', conditions: 'Min monthly balance 50M', negotiatedBy: 'admin', approvalLevel: 'HEAD_OF_OPS', effectiveFrom: '2024-01-01', effectiveTo: '2024-06-30', status: 'ACTIVE' },
];

const mockCommissions = [
  { id: 1, agreementCode: 'COM-001', partnerName: 'Agent Network Ltd', type: 'AGENT', commissionBasis: 'PERCENTAGE', rate: 0.5, status: 'ACTIVE' },
];

const mockSalesLeads = [
  { id: 1, leadName: 'Potential Corp Client', contactPerson: 'John Obi', phone: '+2348099999999', product: 'Corporate Account', status: 'NEW', assignedTo: 'amara.officer' },
];

// ─── Governance Mock Data ─────────────────────────────────────────────────────

const mockGovernanceAudit = [
  { id: 1, paramId: 1, createdAt: '2024-01-10T12:00:00Z', changedBy: 'chidinma.admin', oldValue: '2000000', newValue: '5000000', changeReason: 'Increased limit per CBN directive' },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const adminHandlers = [
  // ── User Admin ──────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/users', () => HttpResponse.json(wrap(mockUsers))),
  http.get('/api/v1/admin/users/:id', ({ params }) => {
    const user = mockUsers.find(u => u.id === params.id);
    return HttpResponse.json(wrap(user ?? mockUsers[0]));
  }),
  http.post('/api/v1/admin/users', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: '99', ...body, status: 'PENDING_ACTIVATION', createdAt: new Date().toISOString() }));
  }),
  http.put('/api/v1/admin/users/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: params.id, ...body }));
  }),
  http.post('/api/v1/admin/users/:id/disable', ({ params }) =>
    HttpResponse.json(wrap({ id: params.id, status: 'DISABLED' }))
  ),
  http.post('/api/v1/admin/users/:id/enable', ({ params }) =>
    HttpResponse.json(wrap({ id: params.id, status: 'ACTIVE' }))
  ),
  http.post('/api/v1/admin/users/:id/reset-password', ({ params }) =>
    HttpResponse.json(wrap({ id: params.id, message: 'Password reset email sent' }))
  ),
  http.post('/api/v1/admin/users/:id/force-logout', ({ params }) =>
    HttpResponse.json(wrap({ id: params.id, message: 'User logged out' }))
  ),
  http.post('/api/v1/admin/users/:id/unlock', ({ params }) =>
    HttpResponse.json(wrap({ id: params.id, status: 'ACTIVE' }))
  ),

  // ── Roles ───────────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/roles', () => HttpResponse.json(wrap(mockRoles))),
  http.get('/api/v1/admin/roles/:id', ({ params }) => {
    const role = mockRoles.find(r => r.id === Number(params.id));
    return HttpResponse.json(wrap(role ?? mockRoles[0]));
  }),
  http.post('/api/v1/admin/roles', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 99, ...body, userCount: 0, permissionCount: 0, isSystem: false, createdAt: new Date().toISOString() }));
  }),
  http.put('/api/v1/admin/roles/:roleId/permissions', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ roleId: params.roleId, ...body }));
  }),

  // ── Permissions ─────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/permissions', () => HttpResponse.json(wrap(mockPermissions))),

  // ── Sessions ────────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/sessions', () => HttpResponse.json(wrap(mockSessions))),
  http.delete('/api/v1/admin/sessions/:sessionId', ({ params }) =>
    HttpResponse.json(wrap({ sessionId: params.sessionId, terminated: true }))
  ),

  // ── Login History ───────────────────────────────────────────────────────────
  http.get('/api/v1/admin/login-history', () => HttpResponse.json(wrap(mockLoginEvents))),

  // ── Dashboard Stats ─────────────────────────────────────────────────────────
  http.get('/api/v1/admin/dashboard/stats', () => HttpResponse.json(wrap(mockDashboardStats))),

  // ── Parameters ──────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/parameters', () => HttpResponse.json(wrap(mockParameters))),
  http.get('/api/v1/admin/parameters/feature-flags', () => HttpResponse.json(wrap(mockFeatureFlags))),
  http.get('/api/v1/admin/parameters/rate-tables', () => HttpResponse.json(wrap(mockRateTables))),
  http.get('/api/v1/admin/parameters/lookup-codes', () => HttpResponse.json(wrap(mockLookupCodes))),
  http.get('/api/v1/admin/parameters/system-info', () => HttpResponse.json(wrap(mockSystemInfo))),

  // ── Governance ──────────────────────────────────────────────────────────────
  http.get('/api/v1/governance/parameters', () => HttpResponse.json(wrap(mockParameters))),
  http.patch('/api/v1/governance/parameters/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: Number(params.id), ...body, updatedAt: new Date().toISOString() }));
  }),
  http.post('/api/v1/governance/parameters/:id/approve', ({ params }) =>
    HttpResponse.json(wrap({ id: Number(params.id), approvalStatus: 'APPROVED' }))
  ),
  http.get('/api/v1/governance/parameters/key/:key', ({ params }) => {
    const param = mockParameters.find(p => p.paramKey === params.key);
    return HttpResponse.json(wrap(param ?? mockParameters[0]));
  }),
  http.get('/api/v1/governance/parameters/:id/audit', () =>
    HttpResponse.json(wrap(mockGovernanceAudit))
  ),

  // ── Security Admin ──────────────────────────────────────────────────────────
  http.get('/api/v1/security-admin/overview', () => HttpResponse.json(wrap(mockSecurityOverview))),
  http.get('/api/v1/security-admin/abac-policies', () => HttpResponse.json(wrap(mockAbacPolicies))),
  http.post('/api/v1/security-admin/abac-policies', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 99, ...body }));
  }),
  http.get('/api/v1/security-admin/mfa-enrollments', () => HttpResponse.json(wrap(mockMfaEnrollments))),
  http.get('/api/v1/security-admin/encryption-keys', () => HttpResponse.json(wrap(mockEncryptionKeys))),
  http.get('/api/v1/security-admin/events', () => HttpResponse.json(wrap(mockSecurityEvents))),
  http.get('/api/v1/security-admin/siem-rules', () => HttpResponse.json(wrap(mockSiemRules))),
  http.get('/api/v1/security-admin/masking-policies', () => HttpResponse.json(wrap(mockMaskingPolicies))),
  http.get('/api/v1/security-admin/pii-registry', () => HttpResponse.json(wrap(mockPiiRegistry))),

  // ── Products ────────────────────────────────────────────────────────────────
  http.get('/api/v1/products', () => HttpResponse.json(wrap(mockProducts))),
  http.get('/api/v1/products/:id', ({ params }) => {
    const product = mockProducts.find(p => p.id === Number(params.id));
    return HttpResponse.json(wrap(product ?? mockProducts[0]));
  }),
  http.post('/api/v1/products', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 99, ...body, status: 'DRAFT', createdAt: new Date().toISOString() }));
  }),
  http.post('/api/v1/products/:id/publish', ({ params }) =>
    HttpResponse.json(wrap({ id: Number(params.id), status: 'ACTIVE' }))
  ),
  http.post('/api/v1/products/:id/retire', ({ params }) =>
    HttpResponse.json(wrap({ id: Number(params.id), status: 'RETIRED' }))
  ),
  http.get('/api/v1/products/bundles', () => HttpResponse.json(wrap(mockBundles))),

  // ── Providers ───────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/providers', () => HttpResponse.json(wrap(mockProviders))),
  http.get('/api/v1/admin/providers/:id', ({ params }) => {
    const provider = mockProviders.find(p => p.id === Number(params.id));
    return HttpResponse.json(wrap(provider ?? mockProviders[0]));
  }),
  http.post('/api/v1/admin/providers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 99, ...body, status: 'ACTIVE', healthStatus: 'UNKNOWN' }));
  }),
  http.post('/api/v1/admin/providers/:id/health-check', ({ params }) =>
    HttpResponse.json(wrap({ id: Number(params.id), healthStatus: 'HEALTHY', checkedAt: new Date().toISOString() }))
  ),
  http.post('/api/v1/admin/providers/:id/failover', ({ params }) =>
    HttpResponse.json(wrap({ id: Number(params.id), status: 'FAILOVER', message: 'Failover initiated' }))
  ),
  http.post('/api/v1/admin/providers/:id/suspend', ({ params }) =>
    HttpResponse.json(wrap({ id: Number(params.id), status: 'SUSPENDED' }))
  ),
  http.get('/api/v1/admin/providers/:id/health-logs', () => HttpResponse.json(wrap(mockHealthLogs))),
  http.get('/api/v1/admin/providers/:id/transactions', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/admin/providers/sla', () => HttpResponse.json(wrap(mockSlaRecords))),
  http.get('/api/v1/admin/providers/costs', () => HttpResponse.json(wrap(mockCostRecords))),

  // ── Notifications ───────────────────────────────────────────────────────────
  http.get('/api/v1/notifications/templates', () => HttpResponse.json(wrap(mockTemplates))),
  http.get('/api/v1/notifications/templates/:id', ({ params }) => {
    const tpl = mockTemplates.find(t => t.id === Number(params.id));
    return HttpResponse.json(wrap(tpl ?? mockTemplates[0]));
  }),
  http.post('/api/v1/notifications/templates', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 99, ...body, version: 1, status: 'DRAFT', createdAt: new Date().toISOString() }));
  }),
  http.put('/api/v1/notifications/templates/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: Number(params.id), ...body }));
  }),
  http.get('/api/v1/notifications/channels', () => HttpResponse.json(wrap(mockChannelConfigs))),
  http.get('/api/v1/notifications/delivery-stats', () => HttpResponse.json(wrap(mockDeliveryStats))),
  http.get('/api/v1/notifications/delivery-stats/trend', () => HttpResponse.json(wrap([
    { date: '2024-01-14', sent: 8500, delivered: 8300, failed: 200 },
    { date: '2024-01-15', sent: 9200, delivered: 9000, failed: 200 },
  ]))),
  http.get('/api/v1/notifications/delivery-stats/by-channel', () => HttpResponse.json(wrap([
    { channel: 'SMS', sent: 120000, delivered: 118000, failed: 2000 },
    { channel: 'EMAIL', sent: 80000, delivered: 75000, failed: 5000 },
  ]))),
  http.get('/api/v1/notifications/scheduled', () => HttpResponse.json(wrap(mockScheduledNotifications))),

  // ── Billers ─────────────────────────────────────────────────────────────────
  http.get('/api/v1/admin/billers', () => HttpResponse.json(wrap(mockBillers))),
  http.post('/api/v1/admin/billers', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 99, ...body, isActive: true }));
  }),
  http.put('/api/v1/admin/billers/:id', async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: Number(params.id), ...body }));
  }),

  // ── Campaigns ───────────────────────────────────────────────────────────────
  http.get('/api/v1/campaigns/active', () => HttpResponse.json(wrap(mockCampaigns))),

  // ── Loyalty ─────────────────────────────────────────────────────────────────
  http.get('/api/v1/loyalty/programs', () => HttpResponse.json(wrap(mockLoyaltyPrograms))),
  http.get('/api/v1/loyalty/enroll', () => HttpResponse.json(wrap(mockLoyaltyAccounts))),

  // ── Commissions ─────────────────────────────────────────────────────────────
  http.get('/api/v1/commissions/agreements', () => HttpResponse.json(wrap(mockCommissions))),

  // ── Surveys ─────────────────────────────────────────────────────────────────
  http.get('/api/v1/surveys/type/:type', () => HttpResponse.json(wrap([]))),

  // ── Pricing ─────────────────────────────────────────────────────────────────
  http.get('/api/v1/pricing/discounts', () => HttpResponse.json(wrap(mockDiscounts))),
  http.get('/api/v1/pricing/special-pricing', () => HttpResponse.json(wrap(mockSpecialPricing))),

  // ── Sales ───────────────────────────────────────────────────────────────────
  http.get('/api/v1/sales-leads', () => HttpResponse.json(wrap(mockSalesLeads))),
];
