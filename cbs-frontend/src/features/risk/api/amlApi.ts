import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { AmlAlert, AmlStats, StrReport, AmlRule, CtrReport } from '../types/aml';

export const amlApi = {
  getStats: () =>
    api.get<ApiResponse<AmlStats>>('/api/v1/aml/stats'),

  listAlerts: (params?: { status?: string; priority?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<AmlAlert[]>>('/api/v1/aml/alerts', { params }),

  getAlert: (id: number) =>
    api.get<ApiResponse<AmlAlert>>(`/v1/aml/alerts/${id}`),

  assignAlert: (id: number) =>
    api.post<ApiResponse<AmlAlert>>(`/v1/aml/alerts/${id}/assign`),

  escalateAlert: (id: number, reason: string) =>
    api.post<ApiResponse<AmlAlert>>(`/v1/aml/alerts/${id}/escalate`, { reason }),

  dismissAlert: (id: number, reason: string) =>
    api.post<ApiResponse<AmlAlert>>(`/v1/aml/alerts/${id}/dismiss`, { reason }),

  listStrs: (params?: object) =>
    api.get<ApiResponse<StrReport[]>>('/api/v1/aml/strs', { params }),

  createStr: (data: Partial<StrReport>) =>
    api.post<ApiResponse<StrReport>>('/api/v1/aml/strs', data),

  listCtrs: (params?: object) =>
    api.get<ApiResponse<CtrReport[]>>('/api/v1/aml/ctrs', { params }),

  listRules: () =>
    api.get<ApiResponse<AmlRule[]>>('/api/v1/aml/rules'),

  toggleRule: (id: number, active: boolean) =>
    api.patch<ApiResponse<AmlRule>>(`/v1/aml/rules/${id}/toggle`, { active }),
};
