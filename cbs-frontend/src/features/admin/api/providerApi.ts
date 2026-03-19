import { apiGet, apiPost, apiPut } from '@/lib/api';
import type {
  ServiceProvider as BackendServiceProvider,
  ProviderHealthLog as BackendHealthLog,
  ProviderTransactionLog as BackendTransactionLog,
} from '../types/providerExt';

// ─── Re-export backend entity types ─────────────────────────────────────────
export type ServiceProvider = BackendServiceProvider;
export type ProviderHealthLog = BackendHealthLog;
export type ProviderTransaction = BackendTransactionLog;

// ─── Derived types ──────────────────────────────────────────────────────────

export type ProviderStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export interface SlaRecord {
  providerCode: string;
  providerName: string;
  slaResponseTimeMs: number;
  slaUptimePct: number;
  actualAvgResponseTimeMs: number;
  actualUptimePct: number;
  healthStatus: string;
  slaMet: boolean;
}

export interface CostRecord {
  providerCode: string;
  providerName: string;
  costModel: string;
  costPerCall: number;
  monthlyCost: number;
  currentMonthVolume: number;
  monthlyVolumeLimit: number;
  estimatedMonthlyCost: number;
}

export interface ProviderFailoverConfig {
  failoverProviderId: number;
  autoFailover: boolean;
  maxRetries: number;
}

// ─── API ──────────────────────────────────────────────────────────────────

export const providerApi = {
  getProviders: () =>
    apiGet<ServiceProvider[]>('/api/v1/admin/providers'),

  getProviderById: (id: string | number) =>
    apiGet<ServiceProvider>(`/api/v1/admin/providers/${id}`),

  registerProvider: (data: Partial<ServiceProvider>) =>
    apiPost<ServiceProvider>('/api/v1/admin/providers', data),

  updateProvider: (id: string | number, data: Partial<ServiceProvider>) =>
    apiPut<ServiceProvider>(`/api/v1/admin/providers/${id}`, data),

  healthCheckNow: (id: string | number) =>
    apiPost<ProviderHealthLog>(`/api/v1/admin/providers/${id}/health-check`),

  triggerFailover: (id: string | number) =>
    apiPost<ServiceProvider>(`/api/v1/admin/providers/${id}/failover`),

  suspendProvider: (id: string | number) =>
    apiPost<ServiceProvider>(`/api/v1/admin/providers/${id}/suspend`),

  saveFailoverConfig: (id: string | number, config: ProviderFailoverConfig) =>
    apiPut<ServiceProvider>(`/api/v1/admin/providers/${id}/failover`, config),

  getHealthLogs: (id: string | number) =>
    apiGet<ProviderHealthLog[]>(`/api/v1/admin/providers/${id}/health-logs`),

  getTransactionLogs: (id: string | number) =>
    apiGet<ProviderTransaction[]>(`/api/v1/admin/providers/${id}/transactions`),

  getSlaRecords: () =>
    apiGet<SlaRecord[]>('/api/v1/admin/providers/sla'),

  getCostRecords: () =>
    apiGet<CostRecord[]>('/api/v1/admin/providers/costs'),
};
