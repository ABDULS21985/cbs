import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SecurityOverview {
  totalRoles: number;
  activeRoles: number;
  totalPermissions: number;
  totalUserAssignments: number;
  abacPolicies: number;
  mfaEnrollments: number;
  activeMfaEnrollments: number;
  encryptionKeys: number;
  activeKeys: number;
  securityEvents: number;
  unacknowledgedEvents: number;
  criticalEvents: number;
  siemRules: number;
  maskingPolicies: number;
  piiFields: number;
}

export interface AbacPolicy {
  id: number;
  policyName: string;
  resource: string;
  action: string;
  conditionExpr: Record<string, unknown>;
  effect: 'PERMIT' | 'DENY';
  priority: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MfaEnrollment {
  id: number;
  userId: number;
  mfaMethod: 'TOTP' | 'SMS_OTP' | 'EMAIL_OTP' | 'PUSH_NOTIFICATION' | 'HARDWARE_TOKEN' | 'BIOMETRIC_FACE' | 'BIOMETRIC_FINGERPRINT' | 'FIDO2_WEBAUTHN';
  deviceId: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  lastUsedAt: string | null;
  failureCount: number;
  lockedUntil: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
}

export interface EncryptionKey {
  id: number;
  keyId: string;
  keyAlias: string;
  keyType: string;
  purpose: string;
  algorithm: string;
  keySizeBits: number;
  status: 'ACTIVE' | 'ROTATION_PENDING' | 'ROTATED' | 'EXPIRED' | 'DESTROYED';
  rotationIntervalDays: number;
  lastRotatedAt: string | null;
  nextRotationAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityEvent {
  id: number;
  eventId: string;
  eventCategory: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  eventSource: string;
  eventType: string;
  description: string | null;
  userId: number | null;
  username: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  geoLocation: string | null;
  resourceType: string | null;
  resourceId: string | null;
  actionTaken: string | null;
  threatScore: number;
  correlationId: string | null;
  isAcknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface SiemRule {
  id: number;
  ruleName: string;
  ruleType: 'THRESHOLD' | 'SEQUENCE' | 'AGGREGATION' | 'PATTERN' | 'ANOMALY' | 'COMPOSITE';
  eventFilter: Record<string, unknown>;
  conditionExpr: Record<string, unknown>;
  timeWindowMinutes: number;
  severityOutput: string;
  actionOnTrigger: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaskingPolicy {
  id: number;
  policyName: string;
  entityType: string;
  fieldName: string;
  maskingStrategy: string;
  maskPattern: string | null;
  appliesToRoles: string[] | null;
  appliesToChannels: string[] | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PiiField {
  id: number;
  entityType: string;
  fieldName: string;
  piiCategory: string;
  sensitivityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  encryptionRequired: boolean;
  defaultMaskingStrategy: string;
  retentionDays: number | null;
  gdprLawfulBasis: string | null;
  createdAt: string;
}

export interface SecurityEventPage {
  content: SecurityEvent[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ─── API ──────────────────────────────────────────────────────────────────

const BASE = '/api/v1/security-admin';

export const securityAdminApi = {
  // Overview
  getOverview: () => apiGet<SecurityOverview>(`${BASE}/overview`),

  // ABAC
  getAbacPolicies: () => apiGet<AbacPolicy[]>(`${BASE}/abac-policies`),
  createAbacPolicy: (data: Partial<AbacPolicy>) => apiPost<AbacPolicy>(`${BASE}/abac-policies`, data),
  updateAbacPolicy: (id: number, data: Partial<AbacPolicy>) => apiPut<AbacPolicy>(`${BASE}/abac-policies/${id}`, data),
  deleteAbacPolicy: (id: number) => apiDelete<void>(`${BASE}/abac-policies/${id}`),

  // MFA
  getMfaEnrollments: () => apiGet<MfaEnrollment[]>(`${BASE}/mfa-enrollments`),
  getUserMfaEnrollments: (userId: number) => apiGet<MfaEnrollment[]>(`${BASE}/mfa-enrollments/user/${userId}`),
  suspendMfaEnrollment: (id: number) => apiPost<MfaEnrollment>(`${BASE}/mfa-enrollments/${id}/suspend`),
  revokeMfaEnrollment: (id: number) => apiPost<MfaEnrollment>(`${BASE}/mfa-enrollments/${id}/revoke`),
  activateMfaEnrollment: (id: number) => apiPost<MfaEnrollment>(`${BASE}/mfa-enrollments/${id}/activate`),

  // Encryption Keys
  getEncryptionKeys: () => apiGet<EncryptionKey[]>(`${BASE}/encryption-keys`),
  createEncryptionKey: (data: Partial<EncryptionKey>) => apiPost<EncryptionKey>(`${BASE}/encryption-keys`, data),
  rotateKey: (id: number) => apiPost<EncryptionKey>(`${BASE}/encryption-keys/${id}/rotate`),
  destroyKey: (id: number) => apiPost<EncryptionKey>(`${BASE}/encryption-keys/${id}/destroy`),

  // Security Events
  getSecurityEvents: (params?: { category?: string; page?: number; size?: number }) =>
    apiGet<SecurityEventPage>(`${BASE}/events`, params as Record<string, unknown>),
  acknowledgeEvent: (id: number, acknowledgedBy: string) =>
    apiPost<SecurityEvent>(`${BASE}/events/${id}/acknowledge`, null, { params: { acknowledgedBy } } as never),

  // SIEM Rules
  getSiemRules: () => apiGet<SiemRule[]>(`${BASE}/siem-rules`),
  createSiemRule: (data: Partial<SiemRule>) => apiPost<SiemRule>(`${BASE}/siem-rules`, data),
  updateSiemRule: (id: number, data: Partial<SiemRule>) => apiPut<SiemRule>(`${BASE}/siem-rules/${id}`, data),
  toggleSiemRule: (id: number) => apiPost<SiemRule>(`${BASE}/siem-rules/${id}/toggle`),

  // Masking Policies
  getMaskingPolicies: () => apiGet<MaskingPolicy[]>(`${BASE}/masking-policies`),
  createMaskingPolicy: (data: Partial<MaskingPolicy>) => apiPost<MaskingPolicy>(`${BASE}/masking-policies`, data),
  updateMaskingPolicy: (id: number, data: Partial<MaskingPolicy>) => apiPut<MaskingPolicy>(`${BASE}/masking-policies/${id}`, data),

  // PII Registry
  getPiiRegistry: () => apiGet<PiiField[]>(`${BASE}/pii-registry`),
  registerPiiField: (data: Partial<PiiField>) => apiPost<PiiField>(`${BASE}/pii-registry`, data),
};
