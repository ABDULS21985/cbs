// Auto-generated from backend entities

export interface Card {
  id: number;
  cardNumberHash: string;
  cardNumberMasked: string;
  cardReference: string;
  account: Account;
  customer: Customer;
  cardType: CardType;
  cardScheme: CardScheme;
  cardTier: string;
  cardholderName: string;
  issueDate: string;
  expiryDate: string;
  lastUsedDate: string;
  dailyPosLimit: number;
  dailyAtmLimit: number;
  dailyOnlineLimit: number;
  singleTxnLimit: number;
  monthlyLimit: number;
  creditLimit: number;
  availableCredit: number;
  outstandingBalance: number;
  minimumPayment: number;
  paymentDueDate: string;
  interestRate: number;
  isContactlessEnabled: boolean;
  isOnlineEnabled: boolean;
  isInternationalEnabled: boolean;
  isAtmEnabled: boolean;
  isPosEnabled: boolean;
  pinRetriesRemaining: number;
  status: CardStatus;
  blockReason: string;
  currencyCode: string;
  branchCode: string;
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

export interface CardTransaction {
  id: number;
  transactionRef: string;
  card: Card;
  account: Account;
  transactionType: string;
  channel: string;
  amount: number;
  currencyCode: string;
  billingAmount: number;
  billingCurrency: string;
  fxRate: number;
  merchantName: string;
  merchantId: string;
  merchantCategoryCode: string;
  terminalId: string;
  merchantCity: string;
  merchantCountry: string;
  isInternational: boolean;
  authCode: string;
  responseCode: string;
  status: string;
  declineReason: string;
  isDisputed: boolean;
  disputeReason: string;
  disputeDate: string;
  transactionDate: string;
  settlementDate: string;
  createdAt: string;
  version: number;
}

