// Extended card types — imports canonical Card/CardTransaction from card.ts

export type { Card, CardType, CardScheme, CardStatus, CardTransaction } from './card';

export type DisputeType = 'CHARGEBACK' | 'FRAUD' | 'SERVICE_NOT_RENDERED' | 'DUPLICATE' | 'ATM_FAILED' | 'UNAUTHORIZED' | 'COUNTERFEIT' | 'OTHER';
export type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'CHARGEBACK_FILED' | 'REPRESENTMENT' | 'ARBITRATION' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
export type TokenStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'EXPIRED';
export type WalletProvider = 'APPLE_PAY' | 'GOOGLE_PAY' | 'SAMSUNG_PAY' | 'GARMIN_PAY' | 'OTHER';

export interface CardExtAccount {
  id: number;
  accountNumber: string;
  accountName: string;
}

export interface CardExtCustomer {
  id: number;
  fullName: string;
  email?: string;
  phone?: string;
}

export interface DisputeTimeline {
  timestamp: string;
  action: string;
  actor: string;
  notes?: string;
}

export interface CardDispute {
  id: number;
  disputeRef: string;
  cardId: number;
  customerId: number;
  accountId: number;
  transactionId: number;
  transactionRef: string;
  transactionDate: string;
  transactionAmount: number;
  transactionCurrency: string;
  merchantName: string;
  merchantId: string;
  disputeType: DisputeType;
  disputeReason: string;
  disputeAmount: number;
  disputeCurrency: string;
  cardScheme: string;
  schemeCaseId: string;
  schemeReasonCode: string;
  filingDeadline: string;
  responseDeadline: string;
  arbitrationDeadline: string;
  isSlaBreached: boolean;
  provisionalCreditAmount: number;
  provisionalCreditDate: string;
  provisionalCreditReversed: boolean;
  evidenceDocuments: string[];
  merchantResponse: string;
  merchantResponseDate: string;
  resolutionType: string;
  resolutionAmount: number;
  resolutionDate: string;
  resolutionNotes: string;
  status: DisputeStatus;
  assignedTo: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy?: string;
  version: number;
  timeline: DisputeTimeline[];
}

export interface CardToken {
  id: number;
  tokenRef: string;
  cardId: number;
  customerId: number;
  tokenNumberHash: string;
  tokenNumberSuffix: string;
  tokenRequestorId: string;
  walletProvider: WalletProvider;
  deviceName: string;
  deviceId: string;
  deviceType: string;
  status: TokenStatus;
  activatedAt: string;
  suspendedAt: string;
  suspendReason: string;
  deactivatedAt: string;
  deactivationReason: string;
  tokenExpiryDate: string;
  lastUsedAt: string;
  transactionCount: number;
  createdAt: string;
  updatedAt?: string;
  version: number;
}
