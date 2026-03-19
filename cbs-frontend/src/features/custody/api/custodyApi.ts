import { apiGet, apiPost } from '@/lib/api';

export type CustodyType = 'SECURITIES' | 'DERIVATIVES' | 'MIXED';
export type SettlementStatus = 'PENDING' | 'MATCHED' | 'SUBMITTED' | 'SETTLED' | 'FAILED';

export interface CustodyAccount {
  id: number;
  code: string;
  customerId: string;
  custodyType: CustodyType;
  denomination: string;
  custodian: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  openedAt: string;
  holdings?: { instrumentCode: string; quantity: number; marketValue: number }[];
}

export interface SettlementInstruction {
  id: number;
  ref: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  settlementDate: string;
  instrumentCode: string;
  status: SettlementStatus;
  failureReason?: string;
  matchedWith?: string;
  submittedAt?: string;
  settledAt?: string;
  createdAt: string;
}

export interface SettlementDashboard {
  totalToday: number;
  pending: number;
  failed: number;
  settled: number;
  settledPercent: number;
  totalValueSettled: number;
  totalValuePending: number;
}

export interface SettlementBatch {
  id: number;
  batchRef: string;
  instructions: string[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  settledCount: number;
  failedCount: number;
}

export const custodyApi = {
  // Custody Accounts
  openCustodyAccount: (payload: {
    customerId: string;
    custodyType: CustodyType;
    denomination: string;
    custodian: string;
  }) => apiPost<CustodyAccount>('/api/v1/custody', payload),

  getCustodyAccount: (code: string) =>
    apiGet<CustodyAccount>(`/api/v1/custody/${code}`),

  getCustomerCustodyAccounts: (customerId: string) =>
    apiGet<CustodyAccount[]>(`/api/v1/custody/customer/${customerId}`),

  // Settlement Dashboard
  getSettlementDashboard: () =>
    apiGet<SettlementDashboard>('/api/v1/settlements/dashboard'),

  // Settlement Instructions
  getSettlementInstruction: (ref: string) =>
    apiGet<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}`),

  createSettlementInstruction: (payload: {
    from: string;
    to: string;
    amount: number;
    currency: string;
    settlementDate: string;
    instrumentCode: string;
  }) => apiPost<SettlementInstruction>('/api/v1/settlements/instructions', payload),

  matchInstructions: (ref1: string, ref2: string) =>
    apiPost<{ matched: boolean }>('/api/v1/settlements/instructions/match', { ref1, ref2 }),

  submitSettlement: (ref: string) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/submit`),

  recordSettlementResult: (ref: string, status: 'SETTLED' | 'FAILED', failureReason?: string) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/result`, {
      status,
      failureReason,
    }),

  // Failed Settlements
  getFailedSettlements: () =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/failed'),

  // Batches
  createSettlementBatch: (instructions: string[]) =>
    apiPost<SettlementBatch>('/api/v1/settlements/batches', { instructions }),
};
