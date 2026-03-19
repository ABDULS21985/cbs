// Auto-generated from backend entities

export interface CardSwitchTransaction {
  id: number;
  switchRef: string;
  transactionType: string;
  cardHash: string;
  cardScheme: string;
  merchantId: string;
  merchantName: string;
  merchantCategoryCode: string;
  terminalId: string;
  amount: number;
  currency: string;
  billingAmount: number;
  billingCurrency: string;
  responseCode: string;
  authCode: string;
  acquirerInstitution: string;
  issuerInstitution: string;
  networkRef: string;
  posEntryMode: string;
  auth2SettlementAvgMs: number;
  isInternational: boolean;
  isDeclined: boolean;
  declineReason: string;
  fraudScore: number;
  processedAt: string;
}

