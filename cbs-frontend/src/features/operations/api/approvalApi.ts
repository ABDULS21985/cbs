import { apiGet, apiPost } from '@/lib/api';

export type ApprovalType =
  | 'ACCOUNT_OPENING' | 'LOAN_APPROVAL' | 'PAYMENT_APPROVAL' | 'FEE_WAIVER'
  | 'RATE_OVERRIDE' | 'PARAMETER_CHANGE' | 'USER_CREATION' | 'CARD_REQUEST'
  | 'WRITE_OFF' | 'RESTRUCTURE' | 'LIMIT_CHANGE' | 'KYC_OVERRIDE';

export type ApprovalPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'DELEGATED' | 'ESCALATED';

export interface ApprovalRequest {
  id: string;
  requestNumber: string;
  type: ApprovalType;
  description: string;
  requestedBy: string;
  requestedByRole: string;
  amount?: number;
  currency?: string;
  priority: ApprovalPriority;
  submittedAt: string;
  slaDeadline: string;
  slaHours: number;
  status: ApprovalStatus;
  assignedTo: string;
  entityId?: string;
  entityType?: string;
  comments?: ApprovalComment[];
  approvalChain?: ApprovalChainStep[];
  documents?: string[];
}

export interface ApprovalComment {
  id: string;
  by: string;
  role: string;
  text: string;
  action: 'COMMENT' | 'APPROVE' | 'REJECT' | 'RETURN' | 'DELEGATE';
  timestamp: string;
}

export interface ApprovalChainStep {
  level: number;
  approver: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  timestamp?: string;
  comments?: string;
}

export interface Delegation {
  id: string;
  delegatedBy: string;
  delegatedTo: string;
  delegatedToRole: string;
  fromDate: string;
  toDate: string;
  scope: 'ALL' | 'SPECIFIC';
  types?: ApprovalType[];
  reason: string;
  active: boolean;
  createdAt: string;
}

export interface EscalationRule {
  id: string;
  type: ApprovalType | 'ALL';
  escalateAfterHours: number;
  notifyAfterHours: number;
  escalateTo: string;
  active: boolean;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getMyQueue(): Promise<ApprovalRequest[]> {
  return apiGet<ApprovalRequest[]>('/api/v1/approvals/my-queue');
}

export function getTeamQueue(): Promise<ApprovalRequest[]> {
  return apiGet<ApprovalRequest[]>('/api/v1/approvals/team-queue');
}

export function getDelegatedQueue(): Promise<ApprovalRequest[]> {
  return apiGet<ApprovalRequest[]>('/api/v1/approvals/delegated-queue');
}

export function getApprovalHistory(params?: {
  type?: ApprovalType;
  status?: ApprovalStatus;
  from?: string;
  to?: string;
}): Promise<ApprovalRequest[]> {
  return apiGet<ApprovalRequest[]>('/api/v1/approvals/history', params as Record<string, unknown>);
}

export function getApprovalById(id: string): Promise<ApprovalRequest | null> {
  return apiGet<ApprovalRequest>(`/api/v1/approvals/${id}`).catch(() => null);
}

export function approveRequest(id: string, comments?: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/api/v1/approvals/${id}/approve`, { comments });
}

export function rejectRequest(id: string, reason: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/api/v1/approvals/${id}/reject`, { reason });
}

export function returnForAmendment(id: string, comments: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/api/v1/approvals/${id}/return`, { comments });
}

export function delegateRequest(id: string, delegateTo: string, reason: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/api/v1/approvals/${id}/delegate`, { delegateTo, reason });
}

export function bulkApprove(ids: string[], comments?: string): Promise<ApprovalRequest[]> {
  return apiPost<ApprovalRequest[]>('/api/v1/approvals/bulk-approve', { ids, comments });
}

export function getDelegations(): Promise<Delegation[]> {
  return apiGet<Delegation[]>('/api/v1/approvals/delegations');
}

export function createDelegation(data: Omit<Delegation, 'id' | 'active' | 'createdAt'>): Promise<Delegation> {
  return apiPost<Delegation>('/api/v1/approvals/delegations', data);
}

export function cancelDelegation(id: string): Promise<void> {
  return apiPost<void>(`/api/v1/approvals/delegations/${id}/cancel`);
}

export function getEscalationRules(): Promise<EscalationRule[]> {
  return apiGet<EscalationRule[]>('/api/v1/approvals/escalation-rules');
}

export function updateEscalationRule(id: string, data: Partial<EscalationRule>): Promise<EscalationRule> {
  return apiPost<EscalationRule>(`/api/v1/approvals/escalation-rules/${id}`, data);
}

export function getStats(): Promise<{
  myPending: number;
  teamPending: number;
  slaBreached: number;
  approvedToday: number;
  rejectedToday: number;
}> {
  return apiGet<{
    myPending: number;
    teamPending: number;
    slaBreached: number;
    approvedToday: number;
    rejectedToday: number;
  }>('/api/v1/approvals/stats');
}
