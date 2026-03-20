import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type {
  AmlAlert,
  AmlRule,
  AmlDashboard,
  AmlStats,
  CreateAmlRulePayload,
  FileStrPayload,
} from '../types/aml';

export const amlApi = {
  // ─── Rules ──────────────────────────────────────────────────────────────────

  /** POST /v1/aml/rules */
  createRule: (data: CreateAmlRulePayload) =>
    apiPost<AmlRule>('/api/v1/aml/rules', data),

  /** GET /v1/aml/rules */
  getActiveRules: () =>
    apiGet<AmlRule[]>('/api/v1/aml/rules').catch(() => []),

  /** PATCH /v1/aml/rules/{id}/toggle */
  toggleRule: (id: number) =>
    apiPatch<AmlRule>(`/api/v1/aml/rules/${id}/toggle`),

  // ─── Alerts ─────────────────────────────────────────────────────────────────

  /** GET /v1/aml/alerts/{id} */
  getAlert: (id: number) =>
    apiGet<AmlAlert>(`/api/v1/aml/alerts/${id}`),

  /** GET /v1/aml/alerts */
  getAlerts: (params?: { status?: string; page?: number; size?: number }) =>
    apiGet<AmlAlert[]>('/api/v1/aml/alerts', params as Record<string, unknown>).catch(() => []),

  /** GET /v1/aml/alerts/customer/{customerId} */
  getCustomerAlerts: (customerId: number, params?: Record<string, unknown>) =>
    apiGet<AmlAlert[]>(`/api/v1/aml/alerts/customer/${customerId}`, params).catch(() => []),

  /** POST /v1/aml/alerts/{id}/assign */
  assignAlert: (id: number, assignedTo: string) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/assign`, { assignedTo }),

  /** POST /v1/aml/alerts/{id}/escalate */
  escalateAlert: (id: number) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/escalate`),

  /** POST /v1/aml/alerts/{id}/resolve */
  resolveAlert: (id: number, data: { resolution: string; resolvedBy: string }) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/resolve`, data),

  /** POST /v1/aml/alerts/{id}/file-sar */
  fileSar: (id: number, data: { sarReference: string; filedBy: string }) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/file-sar`, data),

  /** POST /v1/aml/alerts/{id}/dismiss */
  dismissAlert: (id: number) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/dismiss`),

  // ─── STRs ───────────────────────────────────────────────────────────────────

  /** POST /v1/aml/strs */
  fileStr: (data: FileStrPayload) =>
    apiPost<Record<string, unknown>>('/api/v1/aml/strs', data),

  /** GET /v1/aml/strs */
  getStrs: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>[]>('/api/v1/aml/strs', params).catch(() => []),

  /** GET /v1/aml/ctrs */
  getCtrs: (params?: Record<string, unknown>) =>
    apiGet<Record<string, unknown>[]>('/api/v1/aml/ctrs', params).catch(() => []),

  // ─── Dashboard & Stats ──────────────────────────────────────────────────────

  /** GET /v1/aml/dashboard */
  getDashboard: () =>
    apiGet<AmlDashboard>('/api/v1/aml/dashboard'),

  /** GET /v1/aml */
  listAll: (params?: Record<string, unknown>) =>
    apiGet<AmlAlert[]>('/api/v1/aml', params).catch(() => []),

  /** GET /v1/aml/stats */
  getStats: () =>
    apiGet<AmlStats>('/api/v1/aml/stats'),
};
