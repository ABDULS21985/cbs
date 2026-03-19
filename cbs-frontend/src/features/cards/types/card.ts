export interface Card {
  id: number;
  cardNumberMasked: string;
  customerName: string;
  customerId: number;
  cardType: 'DEBIT' | 'CREDIT' | 'PREPAID';
  scheme: 'VISA' | 'MASTERCARD' | 'VERVE';
  accountNumber: string;
  accountId: number;
  expiryDate: string;
  nameOnCard: string;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'PENDING_ACTIVATION' | 'SUSPENDED' | 'DESTROYED';
  issuedDate: string;
  deliveryMethod: string;
  controls: CardControls;
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

export interface Agent {
  id: number;
  agentCode: string;
  agentName: string;
  location: string;
  floatBalance: number;
  transactionsToday: number;
  commissionMtd: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}
