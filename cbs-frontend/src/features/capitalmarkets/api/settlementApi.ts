import { apiGet, apiPost } from '@/lib/api';

export type SettlementType = 'DVP' | 'FOP' | 'RVP';
export type SettlementInstructionStatus = 'PENDING' | 'MATCHED' | 'SUBMITTED' | 'SETTLED' | 'FAILED';
export type BatchStatus = 'PREPARING' | 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface SettlementInstruction {
  id: number;
  ref: string;
  type: SettlementType;
  instrumentCode: string;
  instrumentName: string;
  quantity: number;
  amount: number;
  currency: string;
  counterpartyCode: string;
  counterpartyName: string;
  depository: string;
  settlementDate: string;
  matchStatus: 'MATCHED' | 'UNMATCHED' | 'ALLEGED';
  status: SettlementInstructionStatus;
  failureReason?: string;
  matchedWith?: string;
  submittedAt?: string;
  settledAt?: string;
  createdAt: string;
}

export interface SettlementBatch {
  id: number;
  batchRef: string;
  depository: string;
  batchDate: string;
  instructionCount: number;
  netAmount: number;
  currency: string;
  status: BatchStatus;
  settledCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface FailedSettlement {
  id: number;
  instructionRef: string;
  instrumentCode: string;
  instrumentName: string;
  counterpartyCode: string;
  counterpartyName: string;
  failReason: string;
  failDate: string;
  agingDays: number;
  settlementAmount: number;
  currency: string;
  penaltyAccrued: number;
  status: 'FAILED' | 'RESUBMITTED' | 'CANCELLED' | 'ESCALATED';
}

export interface SettlementDashboardData {
  totalToday: number;
  settled: number;
  pending: number;
  failed: number;
  settledPercent: number;
  totalValueSettled: number;
  totalValuePending: number;
  settlementRateByDay: { date: string; rate: number; count: number }[];
  failedTrend: { date: string; count: number }[];
  byDepository: { depository: string; count: number; value: number }[];
  topFailingCounterparties: { counterparty: string; failCount: number; totalAmount: number }[];
  stpRate: number;
}

export const settlementApi = {
  // Instructions
  getInstructions: (params?: { status?: string; dateFrom?: string; dateTo?: string }) =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/instructions', params),

  createInstruction: (payload: {
    type: SettlementType;
    instrumentCode: string;
    quantity: number;
    amount: number;
    currency: string;
    counterpartyCode: string;
    depository: string;
    settlementDate: string;
  }) => apiPost<SettlementInstruction>('/api/v1/settlements/instructions', payload),

  getInstruction: (ref: string) =>
    apiGet<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}`),

  matchInstructions: (ref1: string, ref2: string) =>
    apiPost<{ matched: boolean }>('/api/v1/settlements/instructions/match', { ref1, ref2 }),

  submitInstruction: (ref: string) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/submit`),

  recordResult: (ref: string, status: 'SETTLED' | 'FAILED', failureReason?: string) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/result`, { status, failureReason }),

  // Batches
  getBatches: (params?: { status?: string }) =>
    apiGet<SettlementBatch[]>('/api/v1/settlements/batches', params),

  createBatch: (payload: { instructionRefs: string[]; depository: string }) =>
    apiPost<SettlementBatch>('/api/v1/settlements/batches', payload),

  // Failed
  getFailedSettlements: () =>
    apiGet<FailedSettlement[]>('/api/v1/settlements/failed'),

  // Dashboard
  getDashboard: () =>
    apiGet<SettlementDashboardData>('/api/v1/settlements/dashboard'),
};
