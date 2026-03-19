import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { FraudAlert, FraudStats, FraudTrendPoint, FraudTransaction, FraudRule, ModelPerformance } from '../types/fraud';

export const fraudApi = {
  getStats: () =>
    api.get<ApiResponse<FraudStats>>('/api/v1/fraud/stats'),

  getTrend: (days?: number) =>
    api.get<ApiResponse<FraudTrendPoint[]>>('/api/v1/fraud/trend', { params: { days } }),

  listAlerts: (params?: { status?: string; severity?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ items: FraudAlert[]; page: object }>>('/api/v1/fraud/alerts', { params }),

  getAlert: (id: number) =>
    api.get<ApiResponse<FraudAlert>>(`/api/v1/fraud/alerts/${id}`),

  getAlertTransactions: (alertId: number) =>
    api.get<ApiResponse<FraudTransaction[]>>(`/api/v1/fraud/alerts/${alertId}/transactions`),

  blockCard: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/block-card`),

  blockAccount: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/block-account`),

  allowTransaction: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/allow`),

  dismissAlert: (alertId: number, reason: string) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/dismiss`, { reason }),

  fileFraudCase: (alertId: number) =>
    api.post(`/api/v1/fraud/alerts/${alertId}/file-case`),

  listRules: () =>
    api.get<ApiResponse<FraudRule[]>>('/api/v1/fraud/rules'),

  toggleRule: (id: number, active: boolean) =>
    api.patch(`/api/v1/fraud/rules/${id}/toggle`, { active }),

  getModelPerformance: () =>
    api.get<ApiResponse<ModelPerformance>>('/api/v1/fraud/model-performance'),
};
