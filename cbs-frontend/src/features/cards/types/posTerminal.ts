// Auto-generated from backend entities

export interface PosTerminal {
  id: number;
  terminalId: string;
  terminalType: string;
  merchantId: string;
  merchantName: string;
  merchantCategoryCode: string;
  locationAddress: string;
  supportsContactless: boolean;
  supportsChip: boolean;
  supportsMagstripe: boolean;
  supportsPin: boolean;
  supportsQr: boolean;
  maxTransactionAmount: number;
  acquiringBankCode: string;
  settlementAccountId: number;
  batchSettlementTime: string;
  lastTransactionAt: string;
  transactionsToday: number;
  operationalStatus: string;
  lastHeartbeatAt: string;
  softwareVersion: string;
  createdAt: string;
  updatedAt?: string;
}

