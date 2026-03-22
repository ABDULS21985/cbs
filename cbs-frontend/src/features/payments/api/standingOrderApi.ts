import { apiGet, apiPost, apiPostParams, apiPutParams } from '@/lib/api';
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
    apiPostParams<StandingOrder>('/api/v1/standing-orders', {
      debitAccountId: data.sourceAccountId,
      type: 'STANDING_ORDER',
      creditAccountNumber: data.beneficiaryAccount,
      creditAccountName: data.beneficiaryName,
      creditBankCode: data.beneficiaryBankCode,
      amount: data.amount,
      currencyCode: data.currency,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
      narration: data.description,
    }),
  update: (id: number, data: Partial<StandingOrder>) =>
    apiPutParams<StandingOrder>(`/api/v1/standing-orders/${id}`, {
      amount: data.amount,
      frequency: data.frequency,
      endDate: data.endDate,
      narration: data.description,
    }),
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
    apiPostParams<DirectDebitMandate>('/api/v1/direct-debits', {
      debitAccountId: data.accountId,
      creditAccountNumber: data.creditorCode,
      creditAccountName: data.creditorName,
      amount: data.maxAmount,
      frequency: data.frequency,
      startDate: data.validFrom,
      endDate: data.validTo,
      mandateRef: data.mandateRef,
    }),
  revokeMandate: (id: number) =>
    apiPost<DirectDebitMandate>(`/api/v1/direct-debits/${id}/revoke`, {}),
};
