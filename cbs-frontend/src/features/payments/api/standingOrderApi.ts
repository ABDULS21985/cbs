import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { Auditable } from '@/types/common';

export interface StandingOrder extends Auditable {
  id: number;
  reference: string;
  sourceAccountId: number;
  sourceAccountNumber: string;
  sourceAccountName: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  beneficiaryBankCode?: string;
  beneficiaryBankName?: string;
  amount: number;
  currency: string;
  frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  nextExecution: string;
  lastExecuted?: string;
  description: string;
  executionCount: number;
  failureCount: number;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'FAILED' | 'CANCELLED';
}

export interface StandingOrderExecution {
  id: number;
  executionNumber: number;
  executionDate: string;
  amount: number;
  transactionRef?: string;
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  failureReason?: string;
}

export interface DirectDebitMandate extends Auditable {
  id: number;
  mandateRef: string;
  accountId: number;
  accountNumber: string;
  creditorName: string;
  creditorCode: string;
  maxAmount: number;
  currency: string;
  frequency: StandingOrder['frequency'];
  validFrom: string;
  validTo?: string;
  lastDebit?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
}

export const standingOrderApi = {
  getAll: (filters?: Record<string, unknown>) =>
    apiGet<StandingOrder[]>('/api/v1/standing-orders', filters),
  getById: (id: number) =>
    apiGet<StandingOrder>(`/api/v1/standing-orders/${id}`),
  create: (data: Partial<StandingOrder>) =>
    apiPost<StandingOrder>('/api/v1/standing-orders', data),
  update: (id: number, data: Partial<StandingOrder>) =>
    apiPut<StandingOrder>(`/api/v1/standing-orders/${id}`, data),
  pause: (id: number) =>
    apiPost<StandingOrder>(`/api/v1/standing-orders/${id}/pause`, {}),
  resume: (id: number) =>
    apiPost<StandingOrder>(`/api/v1/standing-orders/${id}/resume`, {}),
  cancel: (id: number) =>
    apiPost<StandingOrder>(`/api/v1/standing-orders/${id}/cancel`, {}),
  getExecutions: (id: number) =>
    apiGet<StandingOrderExecution[]>(`/api/v1/standing-orders/${id}/executions`),
  retryExecution: (orderId: number, executionId: number) =>
    apiPost<StandingOrderExecution>(`/api/v1/standing-orders/${orderId}/executions/${executionId}/retry`, {}),
  getDirectDebits: (filters?: Record<string, unknown>) =>
    apiGet<DirectDebitMandate[]>('/api/v1/direct-debits', filters),
  authorizeMandate: (data: Partial<DirectDebitMandate>) =>
    apiPost<DirectDebitMandate>('/api/v1/direct-debits', data),
  revokeMandate: (id: number) =>
    apiPost<DirectDebitMandate>(`/api/v1/direct-debits/${id}/revoke`, {}),
};
