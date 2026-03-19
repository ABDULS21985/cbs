// Auto-generated from backend entities

export interface AtmJournalEntry {
  id: number;
  terminalId: string;
  journalType: string;
  cardNumberMasked: string;
  amount: number;
  responseCode: string;
  status: string;
  errorDescription: string;
  createdAt: string;
}

export interface AtmTerminal {
  id: number;
  terminalId: string;
  terminalName: string;
  terminalType: string;
  branchCode: string;
  address: string;
  city: string;
  geoLatitude: number;
  geoLongitude: number;
  vaultId: number;
  currentCashBalance: number;
  maxCashCapacity: number;
  minCashThreshold: number;
  currencyCode: string;
  lastReplenishedAt: string;
  forecastedEmptyDate: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  softwareVersion: string;
  status: string;
  lastHealthCheck: string;
  supportsCardless: boolean;
  supportsDeposit: boolean;
  supportsChequeDeposit: boolean;
  installedDate: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

