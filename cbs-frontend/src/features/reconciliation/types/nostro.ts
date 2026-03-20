// ─── Nostro/Vostro Position Management Types ─────────────────────────────────

export type PositionType = 'NOSTRO' | 'VOSTRO';
export type ReconciliationStatus = 'PENDING' | 'RECONCILED' | 'PARTIALLY_RECONCILED' | 'UNRECONCILED';
export type MatchStatus = 'MATCHED' | 'UNMATCHED' | 'PARTIALLY_MATCHED' | 'WRITTEN_OFF';
export type ReconItemType = 'OUR_ITEM' | 'THEIR_ITEM';

export interface CorrespondentBank {
  id: number;
  bankCode: string;
  bankName: string;
  swiftBic: string;
  country: string;
  city: string;
  relationshipType: string;
  isActive: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface NostroPosition {
  id: number;
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
  updatedAt?: string;
  // Flattened from JPA relationships:
  correspondentBankId?: number;
  correspondentBankName?: string;
  correspondentBankSwift?: string;
  accountNumber?: string;
  accountName?: string;
}

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
  createdAt: string;
}
