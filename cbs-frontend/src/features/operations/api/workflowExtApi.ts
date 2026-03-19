import { apiGet, apiPost } from '@/lib/api';
import type { WorkflowDefinition, WorkflowInstance } from '../types/workflow';

export const workflowsApi = {
  /** POST /v1/workflows/definitions */
  createDefinition: (data: Partial<WorkflowDefinition>) =>
    apiPost<WorkflowDefinition>('/api/v1/workflows/definitions', data),

  /** GET /v1/workflows/definitions */
  getAllDefinitions: (params?: Record<string, unknown>) =>
    apiGet<WorkflowDefinition[]>('/api/v1/workflows/definitions', params),

  /** POST /v1/workflows/initiate */
  initiate: () =>
    apiPost<WorkflowInstance>('/api/v1/workflows/initiate'),

  /** GET /v1/workflows/instances/{id} */
  getInstance: (id: number) =>
    apiGet<WorkflowInstance>(`/api/v1/workflows/instances/${id}`),

  /** GET /v1/workflows/instances */
  getByStatus: (params?: Record<string, unknown>) =>
    apiGet<WorkflowInstance[]>('/api/v1/workflows/instances', params),

  /** POST /v1/workflows/instances/{id}/approve */
  approve: (id: number) =>
    apiPost<WorkflowInstance>(`/api/v1/workflows/instances/${id}/approve`),

  /** POST /v1/workflows/instances/{id}/reject */
  reject: (id: number) =>
    apiPost<WorkflowInstance>(`/api/v1/workflows/instances/${id}/reject`),

  /** POST /v1/workflows/sla-check */
  checkSla: () =>
    apiPost<Record<string, unknown>>('/api/v1/workflows/sla-check'),

};
