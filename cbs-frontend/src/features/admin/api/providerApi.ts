import { apiGet, apiPost, apiPut } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ProviderStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'MAINTENANCE';
export type ProviderType = 'IDENTITY' | 'PAYMENT_SWITCH' | 'CREDIT_BUREAU' | 'SMS' | 'EMAIL' | 'PUSH' | 'INSURANCE' | 'REMITTANCE' | 'USSD' | 'CARD_SCHEME';
export type IntegrationType = 'REST' | 'SOAP' | 'ISO8583' | 'SFTP' | 'SDK';
export type CostModel = 'PER_CALL' | 'MONTHLY_FLAT' | 'TIERED' | 'REVENUE_SHARE';

export interface ServiceProvider {
  id: string;
  code: string;
  name: string;
  type: ProviderType;
  integration: IntegrationType;
  description: string;
  baseUrl: string;
  uptime: number;
  avgLatencyMs: number;
  monthlyVolume: number;
  todayCalls: number;
  todayErrors: number;
  costModel: CostModel;
  monthlyCost: number;
  budget: number;
  status: ProviderStatus;
  failoverProviderId?: string;
  failoverTrigger?: string;
  lastHealthCheck: string;
  registeredAt: string;
}

export interface ProviderHealthLog {
  timestamp: string;
  uptime: number;
  avgLatencyMs: number;
  callCount: number;
  errorCount: number;
  status: ProviderStatus;
}

export interface ProviderTransaction {
  id: string;
  providerId: string;
  timestamp: string;
  endpoint: string;
  method: string;
  responseCode: string;
  latencyMs: number;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  errorMessage?: string;
}

export interface SlaRecord {
  month: string;
  provider: string;
  providerName: string;
  slaUptimeTarget: number;
  actualUptime: number;
  slaResponseTarget: number;
  actualResponse: number;
  uptimeMet: boolean;
  responseMet: boolean;
  penaltyAmount?: number;
}

export interface CostRecord {
  month: string;
  providerId: string;
  providerName: string;
  costModel: CostModel;
  unitCost: number;
  volume: number;
  totalCost: number;
  budget: number;
  variance: number;
}

export interface ProviderFailoverConfig {
  failoverProviderId: string;
  triggerCondition: string;
  monitoringWindow: string;
  autoFailover: boolean;
  notifyOnFailover: boolean;
}

// ─── API ──────────────────────────────────────────────────────────────────

export type RegisterProviderRequest = Omit<ServiceProvider, 'id' | 'uptime' | 'avgLatencyMs' | 'monthlyVolume' | 'todayCalls' | 'todayErrors' | 'monthlyCost' | 'status' | 'lastHealthCheck' | 'registeredAt'> & {
  slaUptimeTarget?: number;
  slaResponseTarget?: number;
};

export type UpdateProviderRequest = Partial<RegisterProviderRequest>;

export const providerApi = {
  getProviders: () =>
    apiGet<ServiceProvider[]>('/api/v1/admin/providers'),
  getProviderById: (id: string) =>
    apiGet<ServiceProvider>(`/v1/admin/providers/${id}`),
  registerProvider: (data: RegisterProviderRequest) =>
    apiPost<ServiceProvider>('/api/v1/admin/providers', data),
  updateProvider: (id: string, data: UpdateProviderRequest) =>
    apiPut<ServiceProvider>(`/v1/admin/providers/${id}`, data),
  healthCheckNow: (id: string) =>
    apiPost<ServiceProvider>(`/v1/admin/providers/${id}/health-check`),
  triggerFailover: (id: string) =>
    apiPost<{ success: boolean; message: string }>(`/v1/admin/providers/${id}/failover`),
  suspendProvider: (id: string) =>
    apiPost<ServiceProvider>(`/v1/admin/providers/${id}/suspend`),
  saveFailoverConfig: (id: string, config: ProviderFailoverConfig) =>
    apiPut<ServiceProvider>(`/v1/admin/providers/${id}/failover`, config),
  getHealthLogs: (id: string, days?: number) =>
    apiGet<ProviderHealthLog[]>(`/v1/admin/providers/${id}/health-logs`, { days }),
  getHealthLog: (id: string, days?: number) =>
    apiGet<ProviderHealthLog[]>(`/v1/admin/providers/${id}/health-logs`, { days }),
  getTransactionLogs: (id: string, params?: Record<string, unknown>) =>
    apiGet<ProviderTransaction[]>(`/v1/admin/providers/${id}/transactions`, params),
  getTransactionLog: (id: string, params?: Record<string, unknown>) =>
    apiGet<ProviderTransaction[]>(`/v1/admin/providers/${id}/transactions`, params),
  getSlaRecords: (params?: Record<string, unknown>) =>
    apiGet<SlaRecord[]>('/api/v1/admin/providers/sla', params),
  getCostRecords: (params?: Record<string, unknown>) =>
    apiGet<CostRecord[]>('/api/v1/admin/providers/costs', params),
};
