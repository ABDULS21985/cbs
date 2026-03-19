import { apiGet, apiPost } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReconciliationStatus = 'MATCHED' | 'PARTIAL' | 'UNMATCHED';

export interface ReconciliationEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  status: ReconciliationStatus;
  matchedRef?: string;
  matchConfidence?: number; // 0-100
}

export interface ReconciliationSession {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  reconciliationDate: string;
  ourBalance: number;
  bankBalance: number;
  difference: number;
  ourEntries: ReconciliationEntry[];
  bankEntries: ReconciliationEntry[];
  matchedCount: number;
  ourUnmatchedCount: number;
  bankUnmatchedCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PENDING';
  createdAt: string;
}

export interface NostroAccount {
  id: string;
  number: string;
  name: string;
  currency: string;
  correspondentBank: string;
}

export interface MatchPair {
  ourEntryId: string;
  bankEntryId: string;
  confidence: number;
  matchType: 'EXACT' | 'FUZZY' | 'ONE_TO_MANY';
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getNostroAccounts(): Promise<NostroAccount[]> {
  return apiGet<NostroAccount[]>('/api/v1/reconciliation/nostro-accounts').catch(() => []);
}

export function getReconciliationSession(
  accountId: string,
  date: string,
): Promise<ReconciliationSession> {
  return apiGet<ReconciliationSession>('/api/v1/reconciliation/sessions', { accountId, date });
}

export function uploadStatement(accountId: string, file: File): Promise<{ entriesCount: number; dateRange: { from: string; to: string }; totalAmount: number }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('accountId', accountId);
  return apiPost<{ entriesCount: number; dateRange: { from: string; to: string }; totalAmount: number }>('/api/v1/reconciliation/upload-statement', formData);
}

export function runAutoMatch(sessionId: string): Promise<ReconciliationSession> {
  return apiPost<ReconciliationSession>(`/api/v1/reconciliation/sessions/${sessionId}/auto-match`);
}

export function createManualMatch(
  sessionId: string,
  ourEntryIds: string[],
  bankEntryIds: string[],
): Promise<{ matched: MatchPair[] }> {
  return apiPost<{ matched: MatchPair[] }>(`/api/v1/reconciliation/sessions/${sessionId}/manual-match`, { ourEntryIds, bankEntryIds });
}

export function writeOffEntry(
  sessionId: string,
  entryId: string,
  reason: string,
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/v1/reconciliation/sessions/${sessionId}/write-off`, { entryId, reason });
}

export function getReconciliationHistory(
  accountId: string,
): Promise<Array<{ date: string; status: ReconciliationSession['status']; difference: number; matchedCount: number }>> {
  return apiGet<Array<{ date: string; status: ReconciliationSession['status']; difference: number; matchedCount: number }>>('/api/v1/reconciliation/history', { accountId }).catch(() => []);
}
