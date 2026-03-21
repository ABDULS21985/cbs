// Auto-generated from backend entities

export interface CurrencyWallet {
  id: number;
  account: { id: number; accountNumber: string };
  currencyCode: string;
  bookBalance: number;
  availableBalance: number;
  lienAmount: number;
  isPrimary: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export interface WalletCreateRequest {
  currencyCode: string;
}

export interface WalletCreditRequest {
  walletId: number;
  amount: number;
  narration?: string;
}

export interface WalletDebitRequest {
  walletId: number;
  amount: number;
  narration?: string;
}

export interface WalletConvertRequest {
  sourceWalletId: number;
  targetWalletId: number;
  amount: number;
  rate: number;
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  type: 'CREDIT' | 'DEBIT' | 'FX_BUY' | 'FX_SELL';
  amount: number;
  balanceAfter: number;
  narration: string;
  reference: string;
  createdAt: string;
}

