import { apiGet } from '@/lib/api';
import type { TdFrameworkSummary } from '../types/tdFrameworkSummary';

export const tdFrameworkSummaryApi = {
  /** GET /v1/td-framework-summary/{agreementId}/maturity-ladder */
  maturityLadder: (agreementId: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/td-framework-summary/${agreementId}/maturity-ladder`),

  /** GET /v1/td-framework-summary/{agreementId}/rollover-forecast */
  rolloverForecast: (agreementId: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/td-framework-summary/${agreementId}/rollover-forecast`),

  /** GET /v1/td-framework-summary/large-deposits */
  largeDeposits: (params?: Record<string, unknown>) =>
    apiGet<TdFrameworkSummary[]>('/api/v1/td-framework-summary/large-deposits', params),

  /** GET /v1/td-framework-summary/{agreementId}/history */
  history: (agreementId: number) =>
    apiGet<TdFrameworkSummary[]>(`/api/v1/td-framework-summary/${agreementId}/history`),

};
