import { apiGet, apiPost, apiPatch } from '@/lib/api';
import type { VirtualAccount } from '../types/virtualAccountExt';

// Re-export entity type for convenience
export type { VirtualAccount };

// ── Transaction type (maps to va_transaction table) ─────────────────────────

export interface VATransaction {
  id: number;
  vaId: number;
  transactionDate: string;
  reference: string;
  description: string;
  amount: number;
  transactionType: 'CREDIT' | 'DEBIT' | 'SWEEP';
  matchStatus: 'MATCHED' | 'UNMATCHED' | 'PARTIAL';
  matchedRef?: string;
  createdAt: string;
}

// ── Matching Rule (maps to va_matching_rule table) ──────────────────────────

export interface MatchingRule {
  id: number;
  vaId: number;
  ruleType: 'REFERENCE_PREFIX' | 'REGEX' | 'EXACT';
  ruleValue: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// ── Sweep History (maps to va_sweep_history table) ──────────────────────────

export interface VASweepHistory {
  id: number;
  vaId: number;
  sweepAmount: number;
  direction: string;
  balanceBefore: number;
  balanceAfter: number;
  sweptAt: string;
}

// ── API functions ───────────────────────────────────────────────────────────

export function getVirtualAccounts(): Promise<VirtualAccount[]> {
  return apiGet<VirtualAccount[]>('/api/v1/virtual-accounts');
}

export function getVirtualAccountById(id: number | string): Promise<VirtualAccount> {
  return apiGet<VirtualAccount>(`/api/v1/virtual-accounts/${id}`);
}

export function createVirtualAccount(data: Partial<VirtualAccount>): Promise<VirtualAccount> {
  return apiPost<VirtualAccount>('/api/v1/virtual-accounts', data);
}

// ── Credit / Debit / Activate / Deactivate ──────────────────────────────────

export function creditVirtualAccount(
  vaNumber: string,
  amount: number,
  reference?: string,
): Promise<VirtualAccount> {
  const params = new URLSearchParams({ amount: String(amount) });
  if (reference) params.set('reference', reference);
  return apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${vaNumber}/credit?${params}`);
}

export function debitVirtualAccount(
  vaNumber: string,
  amount: number,
): Promise<VirtualAccount> {
  return apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${vaNumber}/debit?amount=${amount}`);
}

export function activateVirtualAccount(vaNumber: string): Promise<VirtualAccount> {
  return apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${vaNumber}/activate`);
}

export function deactivateVirtualAccount(vaNumber: string): Promise<VirtualAccount> {
  return apiPost<VirtualAccount>(`/api/v1/virtual-accounts/${vaNumber}/deactivate`);
}

/** Manual sweep — move balance to physical account */
export function sweepVirtualAccount(vaNumber: string): Promise<VASweepHistory> {
  return apiPost<VASweepHistory>(`/api/v1/virtual-accounts/${vaNumber}/sweep`);
}

/** Bulk sweep all eligible accounts */
export function bulkSweep(): Promise<{ swept: number }> {
  return apiPost<{ swept: number }>('/api/v1/virtual-accounts/sweep');
}

// ── Transactions ────────────────────────────────────────────────────────────

export function getVATransactions(vaId: number | string): Promise<VATransaction[]> {
  return apiGet<VATransaction[]>(`/api/v1/virtual-accounts/${vaId}/transactions`);
}

export function manualMatchTransaction(
  transactionId: number,
  matchedRef: string,
): Promise<VATransaction> {
  return apiPost<VATransaction>(
    `/api/v1/virtual-accounts/transactions/${transactionId}/match?matchedRef=${encodeURIComponent(matchedRef)}`,
  );
}

// ── Matching Rules ──────────────────────────────────────────────────────────

export function getMatchingRules(vaId: number | string): Promise<MatchingRule[]> {
  return apiGet<MatchingRule[]>(`/api/v1/virtual-accounts/${vaId}/rules`);
}

export function updateMatchingRules(vaId: number | string, rules: MatchingRule[]): Promise<MatchingRule[]> {
  return apiPatch<MatchingRule[]>(`/api/v1/virtual-accounts/${vaId}/rules`, rules);
}

// ── Sweep History ───────────────────────────────────────────────────────────

export function getSweepHistory(vaId: number | string): Promise<VASweepHistory[]> {
  return apiGet<VASweepHistory[]>(`/api/v1/virtual-accounts/${vaId}/sweep-history`);
}
