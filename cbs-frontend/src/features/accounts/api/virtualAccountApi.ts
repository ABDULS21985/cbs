import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface VirtualAccount {
  id: string;
  vaNumber: string;
  parentAccountId: string;
  parentAccountNumber: string;
  customerId: string;
  customerName: string;
  pattern: string;
  currency: string;
  balance: number;
  matchedMTD: number;
  unmatchedCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface MatchingRule {
  id: string;
  vaId: string;
  type: 'REFERENCE_PREFIX' | 'REGEX' | 'EXACT';
  value: string;
  priority: number;
}

export interface VATransaction {
  id: string;
  vaId: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  matchStatus: 'MATCHED' | 'UNMATCHED' | 'PARTIAL';
  matchedRef?: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export function getVirtualAccounts(): Promise<VirtualAccount[]> {
  return apiGet<VirtualAccount[]>('/api/v1/virtual-accounts').catch(() => []);
}

export function getVirtualAccountById(id: string): Promise<VirtualAccount> {
  return apiGet<VirtualAccount>(`/api/v1/virtual-accounts/${id}`);
}

export function createVirtualAccount(data: Partial<VirtualAccount>): Promise<VirtualAccount> {
  return apiPost<VirtualAccount>('/api/v1/virtual-accounts', data);
}

export function getVATransactions(id: string): Promise<VATransaction[]> {
  return apiGet<VATransaction[]>(`/api/v1/virtual-accounts/${id}/transactions`).catch(() => []);
}

export function getMatchingRules(vaId: string): Promise<MatchingRule[]> {
  return apiGet<MatchingRule[]>(`/api/v1/virtual-accounts/${vaId}/rules`).catch(() => []);
}

export function updateMatchingRules(vaId: string, rules: MatchingRule[]): Promise<MatchingRule[]> {
  return apiPatch<MatchingRule[]>(`/api/v1/virtual-accounts/${vaId}/rules`, rules);
}
