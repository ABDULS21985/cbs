// ─── Nostro/Vostro Position Management Types ─────────────────────────────────
// Aligned with backend enums: com.cbs.nostro.entity.*

export type PositionType = 'NOSTRO' | 'VOSTRO';

export type ReconciliationStatus = 'PENDING' | 'IN_PROGRESS' | 'RECONCILED' | 'DISCREPANCY';

export type MatchStatus = 'MATCHED' | 'UNMATCHED' | 'PARTIAL' | 'DISPUTED' | 'WRITTEN_OFF';

export type ReconItemType =
  | 'DEBIT_OUR_BOOKS'
  | 'CREDIT_OUR_BOOKS'
  | 'DEBIT_THEIR_BOOKS'
  | 'CREDIT_THEIR_BOOKS'
  | 'UNMATCHED_OURS'
  | 'UNMATCHED_THEIRS';

export type CorrespondentRelationshipType = 'NOSTRO' | 'VOSTRO' | 'BOTH';

export interface CorrespondentBank {
  id: number;
  bankCode: string;
  bankName: string;
  swiftBic: string;
  country: string;
  city: string;
  relationshipType: CorrespondentRelationshipType;
  isActive: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

// Aligned with NostroPositionDto.java
export interface NostroPosition {
  id: number;
  accountId: number;
  accountNumber?: string;
  correspondentBankId: number;
  correspondentBankName?: string;
  correspondentSwiftBic?: string;
  positionType: PositionType;
  currencyCode: string;
  bookBalance: number;
  statementBalance: number;
  unreconciledAmount: number;
  lastStatementDate: string | null;
  lastReconciledDate: string | null;
  reconciliationStatus: ReconciliationStatus;
  outstandingItemsCount: number;
  creditLimit: number | null;
  debitLimit: number | null;
  isActive: boolean;
  createdAt: string;
}

// Aligned with ReconciliationItemDto.java
export interface NostroReconItem {
  id: number;
  itemType: ReconItemType;
  reference: string;
  amount: number;
  currencyCode: string;
  valueDate: string;
  narration: string;
  matchReference: string | null;
  matchStatus: MatchStatus;
  resolvedDate?: string;
  resolvedBy?: string;
  notes?: string;
}

// ─── Sub-Ledger Reconciliation Types ──────────────────────────────────────────
// Aligned with SubledgerReconRun entity and SubledgerReconRunResponse DTO

export type SubledgerType = 'ACCOUNTS' | 'FIXED_DEPOSITS' | 'RECURRING_DEPOSITS' | 'DEPOSITS';

export interface SubledgerReconRun {
  id: number;
  reconDate: string;
  subledgerType: string;
  glCode: string;
  branchCode?: string;
  currencyCode?: string;
  glBalance: number;
  subledgerBalance: number;
  difference: number;
  balanced: boolean;
  exceptionCount: number;
  status: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ─── Create/Update DTOs ─────────────────────────────────────────────────────

export interface CreatePositionRequest {
  accountId: number;
  correspondentBankId: number;
  positionType: PositionType;
  currencyCode: string;
  bookBalance?: number;
  statementBalance?: number;
  creditLimit?: number;
  debitLimit?: number;
}

export interface CreateReconItemRequest {
  itemType: ReconItemType;
  reference: string;
  amount: number;
  currencyCode?: string;
  valueDate: string;
  narration?: string;
  matchReference?: string;
  matchStatus?: MatchStatus;
  notes?: string;
}

export interface RunSubledgerReconRequest {
  subledgerType: SubledgerType;
  glCode: string;
  reconDate: string;
  branchCode?: string;
  currencyCode?: string;
}
