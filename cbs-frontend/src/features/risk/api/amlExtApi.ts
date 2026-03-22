import { apiGet, apiPost } from '@/lib/api';
import type { AmlAlert, AmlRule } from '../types/amlExt';

interface AmlDashboard {
  totalAlerts?: number;
  openAlerts?: number;
  closedAlerts?: number;
  [key: string]: unknown;
}

export const amlApi = {
  /** POST /v1/aml/rules */
  createRule: (data: Partial<AmlRule>) =>
    apiPost<AmlRule>('/api/v1/aml/rules', data),

  /** GET /v1/aml/rules */
  getRules: (params?: Record<string, unknown>) =>
    apiGet<AmlRule[]>('/api/v1/aml/rules', params),

  /** GET /v1/aml/alerts/{id} */
  getAlert: (id: number) =>
    apiGet<AmlAlert>(`/api/v1/aml/alerts/${id}`),

  /** GET /v1/aml/alerts/customer/{customerId} */
  getCustomerAlerts: (customerId: number) =>
    apiGet<AmlAlert[]>(`/api/v1/aml/alerts/customer/${customerId}`),

  /** POST /v1/aml/alerts/{id}/assign */
  assign: (id: number) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/assign`),

  /** POST /v1/aml/alerts/{id}/escalate */
  escalate: (id: number) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/escalate`),

  /** POST /v1/aml/alerts/{id}/resolve */
  resolve: (id: number) =>
    apiPost<AmlAlert>(`/api/v1/aml/alerts/${id}/resolve`),

  /** GET /v1/aml/dashboard */
  getDashboard: (params?: Record<string, unknown>) =>
    apiGet<AmlDashboard>('/api/v1/aml/dashboard', params),

};
