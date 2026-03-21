import { apiGet, apiPost, apiPut, apiPatchParams } from '@/lib/api';

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

/** Base path for AdminController parameter endpoints */
const ADMIN_PARAMS = '/api/v1/admin/parameters';
/** Base path for ParameterController (governance) CRUD with maker-checker */
const GOV_PARAMS = '/api/v1/governance/parameters';

export const parameterApi = {
  // Parameters — read from AdminController, CRUD via governance
  getParameters: (params?: { category?: string; search?: string }): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>(ADMIN_PARAMS, params as Record<string, unknown>),

  getParameter: (code: string): Promise<SystemParameter> =>
    apiGet<SystemParameter>(`${GOV_PARAMS}/key/${code}`),

  createParameter: (data: Partial<SystemParameter>): Promise<SystemParameter> =>
    apiPost<SystemParameter>(GOV_PARAMS, data),

  /** PATCH /v1/governance/parameters/{id}?newValue=...&reason=... */
  updateParameter: (code: string, data: { value: string; reason: string }): Promise<SystemParameter> =>
    apiPatchParams<SystemParameter>(`${GOV_PARAMS}/${code}`, { newValue: data.value, reason: data.reason }),

  updateParameterById: (id: number, data: { value: string; reason: string }): Promise<SystemParameter> =>
    apiPatchParams<SystemParameter>(`${GOV_PARAMS}/${id}`, { newValue: data.value, reason: data.reason }),

  getParameterHistory: (id: number): Promise<ParameterAudit[]> =>
    apiGet<ParameterAudit[]>(`${GOV_PARAMS}/${id}/audit`),

  approveParameter: (id: number): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`${GOV_PARAMS}/${id}/approve`),

  // Feature Flags
  getFeatureFlags: (): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>(`${ADMIN_PARAMS}/feature-flags`),

  toggleFeatureFlag: (code: string, enabled: boolean, reason: string): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`${ADMIN_PARAMS}/feature-flags/${code}`, { enabled, reason }),

  // Rate Tables
  getRateTables: (): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>(`${ADMIN_PARAMS}/rate-tables`),

  getRateTable: (id: number): Promise<SystemParameter> =>
    apiGet<SystemParameter>(`${ADMIN_PARAMS}/rate-tables/${id}`),

  createRateTable: (data: { name: string; type?: string; tiers?: RateTier[] }): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`${ADMIN_PARAMS}/rate-tables`, data),

  updateRateTable: (id: number, data: RateTableUpdateRequest): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`${ADMIN_PARAMS}/rate-tables/${id}`, data),

  // Lookup Codes
  getLookupCodes: (params?: { category?: string }): Promise<SystemParameter[]> =>
    apiGet<SystemParameter[]>(`${ADMIN_PARAMS}/lookup-codes`, params as Record<string, unknown>),

  createLookupCode: (data: CreateLookupRequest): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`${ADMIN_PARAMS}/lookup-codes`, data),

  updateLookupCode: (id: number, data: Partial<{ code: string; description: string; status: string }>): Promise<SystemParameter> =>
    apiPost<SystemParameter>(`${ADMIN_PARAMS}/lookup-codes/${id}`, data),

  // System Info
  getSystemInfo: (): Promise<SystemInfo> =>
    apiGet<SystemInfo>(`${ADMIN_PARAMS}/system-info`),
};
