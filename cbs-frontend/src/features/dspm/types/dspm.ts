export interface DspmDataSource {
  id: number;
  sourceCode: string;
  sourceName: string;
  sourceType: string;
  connectionRef: string;
  environment: string;
  owner: string;
  classification: string;
  sensitivityLevel: string;
  tags: string[];
  lastScanAt: string;
  /**
   * Serialised as a JSON string by the backend (@JsonSerialize ToStringSerializer)
   * to prevent IEEE-754 precision loss for BIGINT values > Number.MAX_SAFE_INTEGER.
   * Use formatRecordCount() to display. Never coerce to Number without BigInt check.
   */
  recordCount: string;
  piiFieldsCount: number;
  status: string;
}

/**
 * Format a recordCount string (serialised BIGINT) for display.
 * Uses Intl.NumberFormat so "5000000" → "5,000,000".
 * Handles values beyond Number.MAX_SAFE_INTEGER via BigInt when available.
 */
export function formatRecordCount(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  try {
    // BigInt is safe for arbitrarily large integers; fall back to Number for older envs
    const n = typeof BigInt !== 'undefined' ? BigInt(String(value)) : Number(value);
    return new Intl.NumberFormat().format(n as Parameters<typeof Intl.NumberFormat.prototype.format>[0]);
  } catch {
    return String(value);
  }
}

export interface DspmScan {
  id: number;
  scanCode: string;
  scanType: string;
  scope: string;
  assetTypes: string[];
  fullScan: boolean;
  triggeredBy: string;
  sourceId: number;
  totalAssets: number;
  assetsScanned: number;
  issuesFound: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  startedAt: string;
  completedAt: string;
  durationSec: number;
  status: string;
}

export interface DspmPolicy {
  id: number;
  policyCode: string;
  policyName: string;
  policyType: string;
  description: string;
  severity: string;
  rule: Record<string, unknown>;
  dataTypes: string[];
  appliesTo: string[];
  enforcementAction: string;
  autoRemediate: boolean;
  violationCount: number;
  lastTriggeredAt: string;
  status: string;
}

export interface DspmException {
  id: number;
  exceptionCode: string;
  policyId: number;
  sourceId: number;
  exceptionType: string;
  reason: string;
  riskAccepted: boolean;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  status: string;
}

export interface DspmIdentity {
  id: number;
  identityCode: string;
  identityName: string;
  identityType: string;
  email: string;
  department: string;
  role: string;
  accessLevel: string;
  dataSourcesCount: number;
  lastAccessAt: string;
  /**
   * Backend serializes BigDecimal. Depending on Jackson config this may arrive as a
   * JSON number (most common) or a JSON string (WRITE_NUMBERS_AS_STRINGS mode).
   * Always coerce with toRiskScore() before arithmetic or comparison.
   */
  riskScore: number | string;
  status: string;
}

/**
 * Safely coerce riskScore to a JavaScript number regardless of whether the
 * backend serialised BigDecimal as a JSON number or a JSON string.
 */
export function toRiskScore(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

export interface DspmAccessAudit {
  id: number;
  auditCode: string;
  identityId: number;
  sourceId: number;
  action: string;
  resourcePath: string;
  queryText: string;
  recordsAffected: number;
  sensitiveFields: string[];
  ipAddress: string;
  userAgent: string;
  outcome: string;
  riskFlag: boolean;
  policyId: number;
  occurredAt: string;
  createdAt: string;
}
