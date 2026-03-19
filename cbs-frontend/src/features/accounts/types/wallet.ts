// Auto-generated from backend entities

export interface CurrencyWallet {
  id: number;
  account: Account;
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

