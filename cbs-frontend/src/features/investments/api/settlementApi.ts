import { apiGet, apiPost } from '@/lib/api';

export interface SettlementInstruction {
  id: number;
  instructionRef: string;
  custodyAccountId: number;
  tradeRef: string;
  instructionType: string;
  settlementCycle: string;
  instrumentCode: string;
  instrumentName: string;
  isin: string;
  quantity: number;
  settlementAmount: number;
  currency: string;
  counterpartyCode: string;
  counterpartyName: string;
  counterpartyBic: string;
  counterpartyAccountRef: string;
  depositoryCode: string;
  placeOfSettlement: string;
  intendedSettlementDate: string;
  actualSettlementDate: string | null;
  matchStatus: string;
  matchedAt: string | null;
  priorityFlag: boolean;
  holdReason: string | null;
  failReason: string | null;
  failedSince: string | null;
  penaltyAmount: number;
  status: string;
  createdAt: string;
}

export interface SettlementBatch {
  id: number;
  batchRef: string;
  depositoryCode: string;
  settlementDate: string;
  totalInstructions: number;
  settledCount: number;
  failedCount: number;
  pendingCount: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  netAmount: number;
  currency: string;
  cutoffTime: string;
  submittedAt: string | null;
  completedAt: string | null;
  status: string;
}

export interface SettlementDashboard {
  totalInstructions: number;
  pendingCount: number;
  matchedCount: number;
  settledCount: number;
  failedCount: number;
  [key: string]: number;
}

export const settlementApi = {
  // Instructions
  listInstructions: () =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/instructions'),
  createInstruction: (data: Partial<SettlementInstruction>) =>
    apiPost<SettlementInstruction>('/api/v1/settlements/instructions', data),
  getInstruction: (ref: string) =>
    apiGet<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}`),
  matchInstructions: (refA: string, refB: string) =>
    apiPost<SettlementInstruction[]>(`/api/v1/settlements/instructions/match?refA=${encodeURIComponent(refA)}&refB=${encodeURIComponent(refB)}`),
  submitInstruction: (ref: string) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/submit`),
  recordResult: (ref: string, settled: boolean) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/result?settled=${settled}`),

  // Batches
  listBatches: () =>
    apiGet<SettlementBatch[]>('/api/v1/settlements/batches'),
  createBatch: (data: Partial<SettlementBatch>) =>
    apiPost<SettlementBatch>('/api/v1/settlements/batches', data),

  // Dashboard & Failed
  getDashboard: () =>
    apiGet<SettlementDashboard>('/api/v1/settlements/dashboard'),
  getFailedInstructions: () =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/failed'),
};
