import { apiGet, apiPost } from '@/lib/api';

export type ParameterType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'DATE' | 'TIME';
export type ParameterCategory =
  | 'GENERAL'
  | 'LIMITS'
  | 'FEES'
  | 'INTEREST'
  | 'SECURITY'
  | 'INTEGRATION'
  | 'EOD'
  | 'NOTIFICATION';

export interface SystemParameter {
  code: string;
  name: string;
  description: string;
  category: ParameterCategory;
  value: string;
  type: ParameterType;
  defaultValue: string;
  minValue?: number;
  maxValue?: number;
  regexPattern?: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  requiresApproval: boolean;
}

export interface ParameterHistory {
  id: string;
  changedAt: string;
  changedBy: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface FeatureFlag {
  code: string;
  name: string;
  description: string;
  enabled: boolean;
  tag?: string;
  lastChangedAt?: string;
  lastChangedBy?: string;
}

export interface RateTier {
  id: string;
  minValue: number;
  maxValue?: number;
  row?: string;
  col?: string;
  rate: number;
}

export interface RateTable {
  id: string;
  name: string;
  type: 'SAVINGS' | 'FD' | 'LENDING' | 'PENALTY';
  effectiveDate: string;
  status: 'ACTIVE' | 'DRAFT' | 'SUPERSEDED';
  tiers: RateTier[];
}

export interface RateTableUpdateRequest {
  name?: string;
  effectiveDate?: string;
  tiers: RateTier[];
}

export interface LookupCode {
  id: string;
  code: string;
  description: string;
  category: string;
  status: 'ACTIVE' | 'INACTIVE';
  displayOrder: number;
}

export interface CreateLookupRequest {
  code: string;
  description: string;
  category: string;
  displayOrder: number;
}

export interface SystemInfo {
  appVersion: string;
  dbVersion: string;
  javaVersion: string;
  springBootVersion: string;
  lastDeployment: string;
  uptimeSeconds: number;
  health: {
    database: boolean;
    redis: boolean;
    messageQueue: boolean;
    externalProviders: { total: number; healthy: number };
    diskUsagePct: number;
    memoryUsagePct: number;
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const parameterApi = {
  getParameters: (params?: { category?: string; search?: string }): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>('/api/v1/parameters', params as Record<string, unknown>).catch(() => []),

  getParameter: (code: string): Promise<SystemParameter> =>
    apiGet<SystemParameter>(`/api/v1/parameters/${code}`),

  updateParameter: (code: string, data: { value: string; reason: string }): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`/api/v1/parameters/${code}`, data),

  getParameterHistory: (code: string): Promise<ParameterHistory[]> =>
    apiGet<ParameterHistory[]>(`/api/v1/parameters/${code}/history`).catch(() => []),

  getFeatureFlags: (): Promise<FeatureFlag[]> =>
    apiGet<FeatureFlag[]>('/api/v1/parameters/feature-flags').catch(() => []),

  toggleFeatureFlag: (code: string, enabled: boolean, reason: string): Promise<FeatureFlag> =>
    apiPost<FeatureFlag>(`/api/v1/parameters/feature-flags/${code}`, { enabled, reason }),

  getRateTables: (): Promise<RateTable[]> =>
    apiGet<RateTable[]>('/api/v1/parameters/rate-tables').catch(() => []),

  getRateTable: (id: string): Promise<RateTable> =>
    apiGet<RateTable>(`/api/v1/parameters/rate-tables/${id}`),

  updateRateTable: (id: string, data: RateTableUpdateRequest): Promise<RateTable> =>
    apiPost<RateTable>(`/api/v1/parameters/rate-tables/${id}`, data),

  getLookupCodes: (params?: { category?: string }): Promise<LookupCode[]> =>
    apiGet<LookupCode[]>('/api/v1/parameters/lookup-codes', params as Record<string, unknown>).catch(() => []),

  createLookupCode: (data: CreateLookupRequest): Promise<LookupCode> =>
    apiPost<LookupCode>('/api/v1/parameters/lookup-codes', data),

  updateLookupCode: (id: string, data: Partial<LookupCode>): Promise<LookupCode> =>
    apiPost<LookupCode>(`/api/v1/parameters/lookup-codes/${id}`, data),

  getSystemInfo: (): Promise<SystemInfo> =>
    apiGet<SystemInfo>('/api/v1/parameters/system-info'),
};
