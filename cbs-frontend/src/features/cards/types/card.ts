// ─── Card Types (canonical source — aligned with backend CardResponse DTO) ──

export type CardType = 'DEBIT' | 'CREDIT' | 'PREPAID' | 'VIRTUAL';
export type CardScheme = 'VISA' | 'MASTERCARD' | 'VERVE' | 'AMEX' | 'UNIONPAY' | 'LOCAL';
export type CardStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'HOT_LISTED'
  | 'EXPIRED'
  | 'REPLACED'
  | 'CANCELLED'
  | 'LOST'
  | 'STOLEN';

export interface Card {
  id: number;
  cardReference: string;
  cardNumberMasked: string;
  accountId: number;
  accountNumber: string;
  customerId: number;
  customerDisplayName: string;
  cardType: CardType;
  cardScheme: CardScheme;
  cardTier: string;
  cardholderName: string;
  issueDate: string;
  expiryDate: string;
  lastUsedDate?: string;
  dailyPosLimit?: number;
  dailyAtmLimit?: number;
  dailyOnlineLimit?: number;
  singleTxnLimit?: number;
  monthlyLimit?: number;
  creditLimit?: number;
  availableCredit?: number;
  outstandingBalance?: number;
  contactlessEnabled?: boolean;
  onlineEnabled?: boolean;
  internationalEnabled?: boolean;
  atmEnabled?: boolean;
  posEnabled?: boolean;
  pinRetriesRemaining?: number;
  status: CardStatus;
  blockReason?: string;
  currencyCode?: string;
  branchCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardControls {
  posEnabled: boolean;
  atmEnabled: boolean;
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  contactlessEnabled: boolean;
}

export interface CardLimits {
  dailyPos: number; maxPos: number;
  dailyAtm: number; maxAtm: number;
  dailyOnline: number; maxOnline: number;
  perTransaction: number; maxPerTransaction: number;
}

export interface CardTransaction {
  id: number;
  transactionRef: string;
  cardId: number;
  cardReference: string;
  accountId: number;
  accountNumber: string;
  transactionType: string;
  channel: string;
  amount: number;
  currencyCode: string;
  billingAmount?: number;
  billingCurrency?: string;
  fxRate?: number;
  merchantName: string;
  merchantId: string;
  merchantCategoryCode: string;
  terminalId?: string;
  merchantCity?: string;
  merchantCountry?: string;
  international?: boolean;
  authCode: string;
  responseCode: string;
  status: string;
  declineReason?: string;
  disputed?: boolean;
  disputeReason?: string;
  disputeDate?: string;
  transactionDate: string;
  settlementDate?: string;
}

export interface Merchant {
  id: number;
  merchantId: string;
  merchantName: string;
  tradingName?: string;
  merchantCategoryCode: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  settlementAccountId?: number;
  settlementFrequency?: string;
  mdrRate: number;
  terminalCount: number;
  monthlyVolumeLimit?: number;
  riskCategory: string;
  chargebackRate: number;
  monitoringLevel?: string;
  status: string;
  onboardedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosTerminal {
  id: number;
  terminalId: string;
  merchantName: string;
  location: string;
  model: string;
  lastTransaction: string;
  onlineStatus: 'ONLINE' | 'IDLE' | 'OFFLINE';
  deployedDate: string;
}
