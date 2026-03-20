// ─── Card Types (canonical source) ───────────────────────────────────────────

export type CardType = 'DEBIT' | 'CREDIT' | 'PREPAID';
export type CardScheme = 'VISA' | 'MASTERCARD' | 'VERVE';
export type CardStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'PENDING_ACTIVATION' | 'SUSPENDED' | 'HOTLISTED' | 'DESTROYED';

export interface Card {
  id: number;
  cardNumberMasked: string;
  customerName: string;
  customerId: number;
  cardType: CardType;
  scheme: CardScheme;
  accountNumber: string;
  accountId: number;
  expiryDate: string;
  nameOnCard: string;
  status: CardStatus;
  issuedDate: string;
  deliveryMethod: string;
  controls: CardControls;
  // Extended fields from backend entity (optional, present on detail view)
  cardNumberHash?: string;
  cardReference?: string;
  cardTier?: string;
  lastUsedDate?: string;
  dailyPosLimit?: number;
  dailyAtmLimit?: number;
  dailyOnlineLimit?: number;
  singleTxnLimit?: number;
  monthlyLimit?: number;
  creditLimit?: number;
  availableCredit?: number;
  outstandingBalance?: number;
  minimumPayment?: number;
  paymentDueDate?: string;
  interestRate?: number;
  pinRetriesRemaining?: number;
  blockReason?: string;
  currencyCode?: string;
  branchCode?: string;
}

export interface CardControls {
  posEnabled: boolean;
  atmEnabled: boolean;
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  contactlessEnabled: boolean;
  recurringEnabled: boolean;
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
  cardMasked: string;
  merchantName: string;
  merchantId: string;
  mcc: string;
  mccDescription: string;
  amount: number;
  currency: string;
  authCode: string;
  responseCode: string;
  responseDescription: string;
  channel: 'POS' | 'ATM' | 'ONLINE' | 'CONTACTLESS';
  transactionDate: string;
  status: 'APPROVED' | 'DECLINED' | 'REVERSED' | 'PENDING';
  fraudScore: number;
  // Extended fields (optional, present in detailed transaction views)
  billingAmount?: number;
  billingCurrency?: string;
  fxRate?: number;
  terminalId?: string;
  merchantCity?: string;
  merchantCountry?: string;
  isInternational?: boolean;
  declineReason?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  disputeDate?: string;
  settlementDate?: string;
  createdAt?: string;
}

export interface Merchant {
  id: number;
  merchantId: string;
  merchantName: string;
  mcc: string;
  mccDescription: string;
  terminalCount: number;
  monthlyVolume: number;
  mdrRate: number;
  chargebackRate: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED';
  status: 'ACTIVE' | 'ONBOARDING' | 'SUSPENDED' | 'TERMINATED';
  onboardedDate: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  bankAccountNumber?: string;
  settlementFrequency?: string;
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
