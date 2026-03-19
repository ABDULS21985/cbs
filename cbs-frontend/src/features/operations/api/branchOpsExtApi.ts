import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { BranchFacility, BranchQueueTicket, BranchServicePlan } from '../types/branchOps';

export const branchOperationsApi = {
  /** POST /v1/branch-operations/facilities */
  registerFacility: (data: Partial<BranchFacility>) =>
    apiPost<BranchFacility>('/api/v1/branch-operations/facilities', data),

  /** GET /v1/branch-operations/facilities/branch/{branchId} */
  getFacilitiesByBranch: (branchId: number) =>
    apiGet<BranchFacility[]>(`/api/v1/branch-operations/facilities/branch/${branchId}`),

  /** POST /v1/branch-operations/facilities/{id}/inspect */
  recordInspection: (id: number) =>
    apiPost<BranchFacility>(`/api/v1/branch-operations/facilities/${id}/inspect`),

  /** GET /v1/branch-operations/facilities/overdue-inspections */
  getOverdueInspections: (params?: Record<string, unknown>) =>
    apiGet<BranchFacility[]>('/api/v1/branch-operations/facilities/overdue-inspections', params),

  /** POST /v1/branch-operations/queue-tickets */
  issueQueueTicket: (data: Partial<BranchQueueTicket>) =>
    apiPost<BranchQueueTicket>('/api/v1/branch-operations/queue-tickets', data),

  /** POST /v1/branch-operations/queue-tickets/call-next/{branchId} */
  callNextTicket: (branchId: number) =>
    apiPost<BranchQueueTicket>(`/api/v1/branch-operations/queue-tickets/call-next/${branchId}`),

  /** POST /v1/branch-operations/queue-tickets/{id}/complete */
  completeService: (id: number) =>
    apiPost<BranchQueueTicket>(`/api/v1/branch-operations/queue-tickets/${id}/complete`),

  /** GET /v1/branch-operations/queue-tickets/status/{branchId} */
  getQueueStatus: (branchId: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/branch-operations/queue-tickets/status/${branchId}`),

  /** POST /v1/branch-operations/service-plans */
  createServicePlan: (data: Partial<BranchServicePlan>) =>
    apiPost<BranchServicePlan>('/api/v1/branch-operations/service-plans', data),

  /** PUT /v1/branch-operations/service-plans/{id}/actuals */
  updateActuals: (id: number) =>
    apiPut<BranchServicePlan>(`/api/v1/branch-operations/service-plans/${id}/actuals`),

};
