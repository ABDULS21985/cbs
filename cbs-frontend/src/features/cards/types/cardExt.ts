// Extended card types — imports canonical Card/CardTransaction from card.ts

export type { Card, CardType, CardScheme, CardStatus, CardTransaction } from './card';

// Backend DisputeType enum — must match CardDisputeService/DisputeType.java exactly
export type DisputeType =
  | 'FRAUD'
  | 'MERCHANDISE_NOT_RECEIVED'
  | 'DEFECTIVE_MERCHANDISE'
  | 'DUPLICATE_CHARGE'
  | 'INCORRECT_AMOUNT'
  | 'CANCELLED_RECURRING'
  | 'NOT_RECOGNISED'
  | 'SERVICE_NOT_PROVIDED'
  | 'ATM_DISPUTE'
  | 'OTHER';

// Backend DisputeStatus enum — must match CardDisputeService/DisputeStatus.java exactly
export type DisputeStatus =
  | 'INITIATED'
  | 'INVESTIGATION'
  | 'CHARGEBACK_FILED'
  | 'REPRESENTMENT'
  | 'PRE_ARBITRATION'
  | 'ARBITRATION'
  | 'RESOLVED_CUSTOMER'
  | 'RESOLVED_MERCHANT'
  | 'WITHDRAWN'
  | 'EXPIRED';

/** Human-readable labels for DisputeType */
export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  FRAUD: 'Fraud',
  MERCHANDISE_NOT_RECEIVED: 'Merchandise Not Received',
  DEFECTIVE_MERCHANDISE: 'Defective Merchandise',
  DUPLICATE_CHARGE: 'Duplicate Charge',
  INCORRECT_AMOUNT: 'Incorrect Amount',
  CANCELLED_RECURRING: 'Cancelled Recurring',
  NOT_RECOGNISED: 'Not Recognised',
  SERVICE_NOT_PROVIDED: 'Service Not Provided',
  ATM_DISPUTE: 'ATM Dispute',
  OTHER: 'Other',
};

/** Human-readable labels for DisputeStatus */
export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  INITIATED: 'Open',
  INVESTIGATION: 'Investigating',
  CHARGEBACK_FILED: 'Chargeback Filed',
  REPRESENTMENT: 'Representment',
  PRE_ARBITRATION: 'Pre-Arbitration',
  ARBITRATION: 'Arbitration',
  RESOLVED_CUSTOMER: 'Resolved (Customer)',
  RESOLVED_MERCHANT: 'Resolved (Merchant)',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
};

/** Whether a status is terminal (no further actions possible) */
export function isTerminalDisputeStatus(status: DisputeStatus | string): boolean {
  return ['RESOLVED_CUSTOMER', 'RESOLVED_MERCHANT', 'WITHDRAWN', 'EXPIRED'].includes(status);
}
export type TokenStatus = 'REQUESTED' | 'ACTIVE' | 'SUSPENDED' | 'HOT_LISTED' | 'DEACTIVATED' | 'EXPIRED';
export type WalletProvider = 'APPLE_PAY' | 'GOOGLE_PAY' | 'SAMSUNG_PAY' | 'GARMIN_PAY' | 'FITBIT_PAY' | 'MERCHANT_TOKEN' | 'ISSUER_TOKEN' | 'COF_TOKEN';

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
  timestamp?: string;
  createdAt?: string;
  action: string;
  actor?: string;
  performedBy?: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
}

/** Get the effective actor name from a timeline entry */
export function getTimelineActor(entry: DisputeTimeline): string {
  return entry.actor || entry.performedBy || 'System';
}

/** Get the effective timestamp from a timeline entry */
export function getTimelineTimestamp(entry: DisputeTimeline): string {
  return entry.timestamp || entry.createdAt || '';
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
