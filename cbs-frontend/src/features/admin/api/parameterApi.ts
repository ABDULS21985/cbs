import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Types matching backend SystemParameter entity ───────────────────────────

export type ParameterCategory =
  | 'GENERAL'
  | 'LIMITS'
  | 'FEES'
  | 'INTEREST'
  | 'SECURITY'
  | 'INTEGRATION'
  | 'EOD'
  | 'NOTIFICATION'
  | 'FEATURE_FLAG'
  | 'RATE_TABLE'
  | 'INTEREST_RATE';

export type ValueType = 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'JSON';

/** Mirrors com.cbs.governance.entity.SystemParameter */
export interface SystemParameter {
  id: number;
  paramKey: string;
  paramCategory: string;
  paramValue: string;
  valueType: ValueType;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  tenantId: number | null;
  branchId: number | null;
  isEncrypted: boolean;
  isActive: boolean;
  lastModifiedBy: string | null;
  approvalStatus: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors com.cbs.governance.entity.ParameterAudit */
export interface ParameterAudit {
  id: number;
  parameterId: number;
  oldValue: string | null;
  newValue: string;
  changedBy: string;
  changeReason: string | null;
  createdAt: string;
}

/** Tier structure stored as JSON in paramValue for rate tables */
export interface RateTier {
  id: string;
  minValue: number;
  maxValue?: number;
  row?: string;
  col?: string;
  rate: number;
}

export interface RateTableUpdateRequest {
  name?: string;
  effectiveDate?: string;
  tiers: RateTier[];
}

export interface CreateLookupRequest {
  code: string;
  description: string;
  category: string;
  displayOrder?: number;
}

export interface SystemInfo {
  appVersion: string;
  javaVersion: string;
  springBootVersion: string;
  dbVersion: string;
  uptime: number;
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  diskUsed: number;
  diskTotal: number;
  activeConnections: number;
}

// ─── API Functions — all hit real backend endpoints ──────────────────────────

export const parameterApi = {
  // Parameters
  getParameters: (params?: { category?: string; search?: string }): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>('/api/v1/parameters', params as Record<string, unknown>).catch(() => []),

  getParameter: (code: string): Promise<SystemParameter> =>
    apiGet<SystemParameter>(`/api/v1/parameters/${code}`),

  createParameter: (data: Partial<SystemParameter>): Promise<SystemParameter> =>
    apiPost<SystemParameter>('/api/v1/parameters', data),

  updateParameter: (code: string, data: { value: string; reason: string }): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`/api/v1/parameters/${code}`, data),

  updateParameterById: (id: number, data: { value: string; reason: string }): Promise<SystemParameter> =>
    apiPut<SystemParameter>(`/api/v1/parameters/${id}`, data),

  getParameterHistory: (code: string): Promise<ParameterAudit[]> =>
    apiGet<ParameterAudit[]>(`/api/v1/parameters/${code}/history`).catch(() => []),

  // Feature Flags
  getFeatureFlags: (): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>('/api/v1/parameters/feature-flags').catch(() => []),

  toggleFeatureFlag: (code: string, enabled: boolean, reason: string): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`/api/v1/parameters/feature-flags/${code}`, { enabled, reason }),

  // Rate Tables
  getRateTables: (): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>('/api/v1/parameters/rate-tables').catch(() => []),

  getRateTable: (id: number): Promise<SystemParameter> =>
    apiGet<SystemParameter>(`/api/v1/parameters/rate-tables/${id}`),

  createRateTable: (data: { name: string; type?: string; tiers?: RateTier[] }): Promise<SystemParameter> =>
    apiPost<SystemParameter>('/api/v1/parameters/rate-tables', data),

  updateRateTable: (id: number, data: RateTableUpdateRequest): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`/api/v1/parameters/rate-tables/${id}`, data),

  // Lookup Codes
  getLookupCodes: (params?: { category?: string }): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>('/api/v1/parameters/lookup-codes', params as Record<string, unknown>).catch(() => []),

  createLookupCode: (data: CreateLookupRequest): Promise<SystemParameter> =>
    apiPost<SystemParameter>('/api/v1/parameters/lookup-codes', data),

  updateLookupCode: (id: number, data: Partial<{ code: string; description: string; status: string }>): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`/api/v1/parameters/lookup-codes/${id}`, data),

  // System Info
  getSystemInfo: (): Promise<SystemInfo> =>
    apiGet<SystemInfo>('/api/v1/parameters/system-info'),
};
