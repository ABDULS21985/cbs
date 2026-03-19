// Auto-generated from backend entities

export interface ProviderHealthLog {
  id: number;
  providerId: number;
  checkTimestamp: string;
  responseTimeMs: number;
  httpStatusCode: number;
  isHealthy: boolean;
  errorMessage: string;
  requestCount: number;
  errorCount: number;
  errorRatePct: number;
  createdAt: string;
}

export interface ProviderTransactionLog {
  id: number;
  providerId: number;
  transactionRef: string;
  operationType: string;
  requestTimestamp: string;
  responseTimestamp: string;
  responseTimeMs: number;
  requestPayloadRef: string;
  responseCode: string;
  responseStatus: string;
  costCharged: number;
  retryCount: number;
  errorCode: string;
  errorMessage: string;
  createdAt: string;
}

export interface ServiceProvider {
  id: number;
  providerCode: string;
  providerName: string;
  providerType: string;
  integrationMethod: string;
  baseUrl: string;
  apiVersion: string;
  authType: string;
  contractReference: string;
  slaResponseTimeMs: number;
  slaUptimePct: number;
  actualAvgResponseTimeMs: number;
  actualUptimePct: number;
  monthlyVolumeLimit: number;
  currentMonthVolume: number;
  costModel: string;
  costPerCall: number;
  monthlyCost: number;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  escalationContactName: string;
  escalationContactEmail: string;
  lastHealthCheckAt: string;
  healthStatus: string;
  failoverProviderId: number;
  status: string;
}

