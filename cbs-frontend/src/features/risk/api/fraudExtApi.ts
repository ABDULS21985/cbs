import { apiGet, apiPost } from '@/lib/api';
import type { FraudAlert, FraudRule } from '../types/fraudExt';

export const fraudApi = {
  /** POST /v1/fraud/score */
  score: () =>
    apiPost<FraudAlert>('/api/v1/fraud/score'),

  /** POST /v1/fraud/rules */
  createRule: (data: Partial<FraudRule>) =>
    apiPost<FraudRule>('/api/v1/fraud/rules', data),

  /** GET /v1/fraud/rules */
  getRules: (params?: Record<string, unknown>) =>
    apiGet<FraudRule[]>('/api/v1/fraud/rules', params),

  /** GET /v1/fraud/alerts */
  getAlerts: (params?: Record<string, unknown>) =>
    apiGet<FraudAlert[]>('/api/v1/fraud/alerts', params),

  /** POST /v1/fraud/alerts/{id}/assign */
  assign: (id: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${id}/assign`),

  /** POST /v1/fraud/alerts/{id}/resolve */
  resolve: (id: number) =>
    apiPost<FraudAlert>(`/api/v1/fraud/alerts/${id}/resolve`),

};
