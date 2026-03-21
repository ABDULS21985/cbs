import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';

// ─── Custody Account (matches CustodyAccount entity) ─────────────────────────

export interface CustodyAccount {
  id: number;
  accountCode: string;
  accountName: string;
  customerId: number;
  accountType: string;
  currency: string;
  totalAssetsValue: number;
  securitiesCount: number;
  settlementEnabled: boolean;
  corporateActions: boolean;
  incomeCollection: boolean;
  proxyVoting: boolean;
  taxReclaim: boolean;
  fxServices: boolean;
  securitiesLending: boolean;
  custodyFeeBps: number;
  transactionFee?: number;
  subCustodian?: string;
  depositoryId?: string;
  status: 'PENDING' | 'ACTIVE';
  openedAt?: string;
}

// ─── Settlement Instruction (matches SettlementInstruction entity) ────────────

export type InstructionType =
  | 'DVP' | 'FOP' | 'RECEIVE_VS_PAYMENT' | 'DELIVERY_VS_PAYMENT'
  | 'RECEIVE_FREE' | 'DELIVERY_FREE' | 'INTERNAL_TRANSFER';

export type SettlementCycle = 'T0' | 'T1' | 'T2' | 'T3';

export type MatchStatus = 'UNMATCHED' | 'MATCHED' | 'ALLEGED' | 'DISPUTED';

export type SettlementStatus =
  | 'CREATED' | 'MATCHED' | 'SETTLING' | 'SETTLED'
  | 'PARTIALLY_SETTLED' | 'FAILED' | 'CANCELLED';

export interface SettlementInstruction {
  id: number;
  instructionRef: string;
  custodyAccountId: number;
  tradeRef?: string;
  instructionType?: InstructionType;
  settlementCycle?: SettlementCycle;
  instrumentCode?: string;
  instrumentName?: string;
  isin?: string;
  quantity?: number;
  settlementAmount?: number;
  currency?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  counterpartyBic?: string;
  counterpartyAccountRef?: string;
  depositoryCode?: string;
  placeOfSettlement?: string;
  intendedSettlementDate?: string;
  actualSettlementDate?: string;
  matchStatus: MatchStatus;
  matchedAt?: string;
  priorityFlag: boolean;
  holdReason?: string;
  failReason?: string;
  failedSince?: string;
  penaltyAmount: number;
  status: SettlementStatus;
  createdAt?: string;
}

// ─── Settlement Dashboard (matches Map<String,Long> from backend) ─────────────

export type SettlementDashboard = {
  totalPending: number;
  totalSettled: number;
  totalFailed: number;
};

// ─── Settlement Batch (matches SettlementBatch entity) ───────────────────────

export type BatchStatus = 'PREPARING' | 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIALLY_COMPLETED';

export interface SettlementBatch {
  id: number;
  batchRef: string;
  depositoryCode?: string;
  settlementDate?: string;
  totalInstructions: number;
  settledCount: number;
  failedCount: number;
  pendingCount: number;
  totalDebitAmount?: number;
  totalCreditAmount?: number;
  netAmount?: number;
  currency?: string;
  cutoffTime?: string;
  submittedAt?: string;
  completedAt?: string;
  status: BatchStatus;
  createdAt?: string;
}

// ─── Create Payloads ─────────────────────────────────────────────────────────

export interface CreateCustodyAccountPayload {
  accountName: string;
  customerId: number;
  accountType: string;
  currency?: string;
  subCustodian?: string;
  depositoryId?: string;
  custodyFeeBps?: number;
  transactionFee?: number;
  settlementEnabled?: boolean;
  corporateActions?: boolean;
  incomeCollection?: boolean;
  proxyVoting?: boolean;
  taxReclaim?: boolean;
  fxServices?: boolean;
  securitiesLending?: boolean;
}

export interface CreateSettlementInstructionPayload {
  custodyAccountId: number;
  instructionType: InstructionType;
  settlementCycle?: SettlementCycle;
  instrumentCode?: string;
  instrumentName?: string;
  isin?: string;
  quantity?: number;
  settlementAmount?: number;
  currency?: string;
  counterpartyCode?: string;
  counterpartyName?: string;
  counterpartyBic?: string;
  counterpartyAccountRef?: string;
  depositoryCode?: string;
  placeOfSettlement?: string;
  intendedSettlementDate: string;   // LocalDate: "YYYY-MM-DD"
  priorityFlag?: boolean;
}

export interface CreateSettlementBatchPayload {
  depositoryCode?: string;
  settlementDate: string;           // LocalDate: "YYYY-MM-DD"
  currency?: string;
  cutoffTime?: string;              // LocalTime: "HH:MM"
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const custodyApi = {
  // Custody Accounts
  getAllCustodyAccounts: () =>
    apiGet<CustodyAccount[]>('/api/v1/custody'),

  openCustodyAccount: (payload: CreateCustodyAccountPayload) =>
    apiPost<CustodyAccount>('/api/v1/custody', payload),

  getCustodyAccount: (code: string) =>
    apiGet<CustodyAccount>(`/api/v1/custody/${code}`),

  getCustomerCustodyAccounts: (customerId: number) =>
    apiGet<CustodyAccount[]>(`/api/v1/custody/customer/${customerId}`),

  // Settlement Dashboard — returns Map<String,Long>
  getSettlementDashboard: () =>
    apiGet<SettlementDashboard>('/api/v1/settlements/dashboard'),

  // Settlement Instructions
  getInstructions: () =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/instructions'),

  getSettlementInstruction: (ref: string) =>
    apiGet<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}`),

  createSettlementInstruction: (payload: CreateSettlementInstructionPayload) =>
    apiPost<SettlementInstruction>('/api/v1/settlements/instructions', payload),

  // Backend: GET|POST /instructions/match?refA=...&refB=...
  matchInstructions: (refA: string, refB: string) => {
    const params = new URLSearchParams({ refA, refB });
    return api.post<{ data: SettlementInstruction[] }>(
      `/api/v1/settlements/instructions/match?${params}`,
    ).then((r) => r.data.data);
  },

  submitSettlement: (ref: string) =>
    apiPost<SettlementInstruction>(`/api/v1/settlements/instructions/${ref}/submit`),

  // Backend: POST /{ref}/result?settled=true/false
  recordSettlementResult: (ref: string, settled: boolean) => {
    const params = new URLSearchParams({ settled: String(settled) });
    return api.post<{ data: SettlementInstruction }>(
      `/api/v1/settlements/instructions/${ref}/result?${params}`,
    ).then((r) => r.data.data);
  },

  // Failed Settlements
  getFailedSettlements: () =>
    apiGet<SettlementInstruction[]>('/api/v1/settlements/failed'),

  // Batches
  getBatches: () =>
    apiGet<SettlementBatch[]>('/api/v1/settlements/batches'),

  createSettlementBatch: (payload: CreateSettlementBatchPayload) =>
    apiPost<SettlementBatch>('/api/v1/settlements/batches', payload),
};
