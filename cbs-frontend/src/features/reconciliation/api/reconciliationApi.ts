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
  matchType?: 'AUTO' | 'MANUAL' | 'RULE';
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
  return apiGet<NostroAccount[]>('/api/v1/reconciliation/nostro-accounts');
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
  return apiGet<Array<{ date: string; status: ReconciliationSession['status']; difference: number; matchedCount: number }>>('/api/v1/reconciliation/history', { accountId });
}

// ─── Statement Import Types ──────────────────────────────────────────────────

export interface StatementHeader {
  accountNumber: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  bankName: string;
  totalCredits: number;
  totalDebits: number;
}

export interface StatementEntry {
  id: string;
  date: string;
  valueDate: string;
  amount: number;
  direction: 'D' | 'C';
  reference: string;
  narration: string;
  balance?: number;
}

export interface ParsedStatement {
  header: StatementHeader;
  entries: StatementEntry[];
  isDuplicate: boolean;
  parseWarnings: string[];
}

export interface ImportRecord {
  id: string;
  importDate: string;
  accountNumber: string;
  bankName: string;
  filename: string;
  format: 'CSV' | 'MT940' | 'XML' | 'SWIFT';
  entriesCount: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  importedBy: string;
  errors?: string[];
}

export interface AutoFetchConfig {
  id: string;
  bankName: string;
  protocol: 'SFTP' | 'SWIFT' | 'API';
  host: string;
  schedule: string;
  lastFetch: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  accountPattern: string;
}

// ─── Break Management Types ──────────────────────────────────────────────────

export type BreakStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'WRITTEN_OFF';
export type BreakResolutionType = 'MANUAL_MATCH' | 'TIMING_DIFFERENCE' | 'CORRECTION' | 'WRITE_OFF' | 'ESCALATE';
export type EscalationLevel = 'OFFICER' | 'TEAM_LEAD' | 'OPS_MANAGER' | 'CFO';

export interface BreakItem {
  id: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  amount: number;
  direction: 'D' | 'C';
  detectedDate: string;
  agingDays: number;
  assignedTo: string;
  status: BreakStatus;
  ourEntry?: ReconciliationEntry;
  bankEntry?: ReconciliationEntry;
  escalationLevel: EscalationLevel;
  slaDeadline: string;
}

export interface BreakTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  notes: string;
  type: 'INFO' | 'ACTION' | 'RESOLVED' | 'ESCALATED';
}

export interface ComplianceCheckItem {
  id: string;
  requirement: string;
  description: string;
  met: boolean;
  lastChecked: string;
}

export interface ComplianceScorePoint {
  month: string;
  score: number;
  target: number;
}

// ─── Statement Import API ────────────────────────────────────────────────────

export function parseStatement(file: File, accountId: string): Promise<ParsedStatement> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('accountId', accountId);
  return apiPost<ParsedStatement>('/api/v1/reconciliation/statements/parse', formData);
}

export function confirmImport(accountId: string, statementDate: string): Promise<{ importId: string }> {
  return apiPost<{ importId: string }>('/api/v1/reconciliation/statements/confirm', { accountId, statementDate });
}

export function rejectImport(accountId: string, statementDate: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/api/v1/reconciliation/statements/reject', { accountId, statementDate });
}

export function getImportHistory(): Promise<ImportRecord[]> {
  return apiGet<ImportRecord[]>('/api/v1/reconciliation/statements/history');
}

export function reImportStatement(importId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/v1/reconciliation/statements/${importId}/reimport`);
}

export function deleteImport(importId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/v1/reconciliation/statements/${importId}/delete`);
}

export function getAutoFetchConfigs(): Promise<AutoFetchConfig[]> {
  return apiGet<AutoFetchConfig[]>('/api/v1/reconciliation/auto-fetch/configs');
}

// ─── Break Management API ────────────────────────────────────────────────────

export function getBreaks(params?: { status?: BreakStatus; currency?: string; assignedTo?: string }): Promise<BreakItem[]> {
  return apiGet<BreakItem[]>('/api/v1/reconciliation/breaks', params);
}

export function getBreakTimeline(breakId: string): Promise<BreakTimelineEvent[]> {
  return apiGet<BreakTimelineEvent[]>(`/api/v1/reconciliation/breaks/${breakId}/timeline`);
}

export function resolveBreak(breakId: string, data: { resolutionType: BreakResolutionType; reason: string; glAccount?: string }): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/v1/reconciliation/breaks/${breakId}/resolve`, data);
}

export function escalateBreak(breakId: string, notes: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/v1/reconciliation/breaks/${breakId}/escalate`, { notes });
}

export function addBreakNote(breakId: string, notes: string): Promise<BreakTimelineEvent> {
  return apiPost<BreakTimelineEvent>(`/api/v1/reconciliation/breaks/${breakId}/notes`, { notes });
}

export function bulkAssignBreaks(breakIds: string[], assignedTo: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/api/v1/reconciliation/breaks/bulk-assign', { breakIds, assignedTo });
}

export function bulkEscalateBreaks(breakIds: string[], notes: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/api/v1/reconciliation/breaks/bulk-escalate', { breakIds, notes });
}

// ─── Reports API ─────────────────────────────────────────────────────────────

export function generateReconciliationReport(reportType: string, params: { dateFrom: string; dateTo: string }): Promise<Blob> {
  return apiPost<Blob>(`/api/v1/reconciliation/reports/${reportType}/generate`, params);
}

export function getComplianceChecklist(): Promise<ComplianceCheckItem[]> {
  return apiGet<ComplianceCheckItem[]>('/api/v1/reconciliation/compliance/checklist');
}

export function getComplianceScoreTrend(): Promise<ComplianceScorePoint[]> {
  return apiGet<ComplianceScorePoint[]>('/api/v1/reconciliation/compliance/score-trend');
}
