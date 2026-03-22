import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { AmlAlert, AmlStats, StrReport, AmlRule, CtrReport } from '../types/aml';

export const amlApi = {
  getStats: () =>
    api.get<ApiResponse<AmlStats>>('/api/v1/aml/stats'),

  listAlerts: (params?: { status?: string; priority?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<AmlAlert[]>>('/api/v1/aml/alerts', { params }),

  getAlert: (id: number) =>
    api.get<ApiResponse<AmlAlert>>(`/api/v1/aml/alerts/${id}`),

  assignAlert: (id: number, assignedTo: string) =>
    api.post<ApiResponse<AmlAlert>>(`/api/v1/aml/alerts/${id}/assign`, null, { params: { assignedTo } }),

  escalateAlert: (id: number) =>
    api.post<ApiResponse<AmlAlert>>(`/api/v1/aml/alerts/${id}/escalate`),

  dismissAlert: (id: number) =>
    api.post<ApiResponse<AmlAlert>>(`/api/v1/aml/alerts/${id}/dismiss`),

  listStrs: (params?: object) =>
    api.get<ApiResponse<StrReport[]>>('/api/v1/aml/strs', { params }),

  createStr: (data: { alertId: number; reference?: string; filedBy?: string }) =>
    api.post<ApiResponse<AmlAlert>>('/api/v1/aml/strs', data),

  listCtrs: (params?: object) =>
    api.get<ApiResponse<CtrReport[]>>('/api/v1/aml/ctrs', { params }),

  listRules: () =>
    api.get<ApiResponse<AmlRule[]>>('/api/v1/aml/rules'),

  toggleRule: (id: number) =>
    api.patch<ApiResponse<Record<string, object>>>(`/api/v1/aml/rules/${id}/toggle`),
};
