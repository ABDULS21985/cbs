import { apiGet, apiPost } from '@/lib/api';

export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'MATCHED' | 'REJECTED';
export type MatchStatus = 'MATCHED' | 'ALLEGED' | 'UNMATCHED';
export type ClearingStatus = 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
export type AllocationStatus = 'PENDING' | 'ALLOCATED' | 'CONFIRMED';

export interface TradeConfirmation {
  id: number;
  tradeRef: string;
  tradeDate: string;
  instrumentCode: string;
  instrumentName: string;
  counterpartyCode: string;
  counterpartyName: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  amount: number;
  currency: string;
  settlementDate: string;
  matchStatus: MatchStatus;
  status: ConfirmationStatus;
  matchedWith?: string;
  submittedAt?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface TradeAllocation {
  id: number;
  allocationRef: string;
  parentOrderRef: string;
  subAccount: string;
  subAccountName: string;
  instrumentCode: string;
  quantity: number;
  price: number;
  amount: number;
  currency: string;
  status: AllocationStatus;
  allocatedAt: string;
  createdAt: string;
}

export interface ClearingEntry {
  id: number;
  clearingRef: string;
  tradeRef: string;
  instrumentCode: string;
  clearingHouse: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  quantity: number;
  amount: number;
  currency: string;
  submittedAt?: string;
  status: ClearingStatus;
  createdAt: string;
}

export interface TradeReport {
  id: number;
  reportRef: string;
  reportType: string;
  reportDate: string;
  tradeCount: number;
  totalVolume: number;
  totalValue: number;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED';
  submittedAt?: string;
  createdAt: string;
}

export const tradeOpsApi = {
  // Confirmations
  getConfirmations: (params?: { status?: string; dateFrom?: string; dateTo?: string; instrument?: string; counterparty?: string }) =>
    apiGet<TradeConfirmation[]>('/api/v1/trade-ops/confirmations', params).catch(() => []),

  submitConfirmation: (payload: {
    tradeDate: string;
    instrumentCode: string;
    counterpartyCode: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    currency: string;
    settlementDate: string;
  }) => apiPost<TradeConfirmation>('/api/v1/trade-ops/confirmations', payload),

  matchConfirmations: (ourRef: string, theirRef: string) =>
    apiPost<{ matched: boolean; matchRef: string }>('/api/v1/trade-ops/confirmations/match', { ourRef, theirRef }),

  getUnmatchedConfirmations: () =>
    apiGet<TradeConfirmation[]>('/api/v1/trade-ops/confirmations/unmatched').catch(() => []),

  // Allocations
  getAllocations: (parentOrderRef?: string) =>
    apiGet<TradeAllocation[]>('/api/v1/trade-ops/allocations', parentOrderRef ? { parentOrderRef } : undefined).catch(() => []),

  submitAllocation: (payload: {
    parentOrderRef: string;
    allocations: { subAccount: string; quantity: number; price: number }[];
  }) => apiPost<TradeAllocation[]>('/api/v1/trade-ops/allocations', payload),

  // Clearing
  getClearingQueue: () =>
    apiGet<ClearingEntry[]>('/api/v1/trade-ops/clearing').catch(() => []),

  submitForClearing: (payload: { tradeRef: string; clearingHouse: string; priority: string }) =>
    apiPost<ClearingEntry>('/api/v1/trade-ops/clearing', payload),

  getPendingClearing: () =>
    apiGet<ClearingEntry[]>('/api/v1/trade-ops/clearing/pending').catch(() => []),

  // Reports
  getTradeReports: (params?: { dateFrom?: string; dateTo?: string; reportType?: string }) =>
    apiGet<TradeReport[]>('/api/v1/trade-ops/reports', params).catch(() => []),

  submitTradeReport: (payload: { reportType: string; reportDate: string; tradeRefs: string[] }) =>
    apiPost<TradeReport>('/api/v1/trade-ops/reports', payload),
};
