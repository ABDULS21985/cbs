// Auto-generated from backend entities

export interface AtmNetworkNode {
  id: number;
  terminalId: string;
  terminalType: string;
  networkZone: string;
  branchId: number;
  locationAddress: string;
  latitude: number;
  longitude: number;
  manufacturer: string;
  model: string;
  softwareVersion: string;
  cashCapacity: number;
  currentCashLevel: number;
  lowCashThreshold: number;
  lastReplenishedAt: string;
  nextReplenishmentDue: string;
  uptimePctMtd: number;
  transactionsToday: number;
  transactionsMtd: number;
  lastTransactionAt: string;
  lastMaintenanceAt: string;
  nextMaintenanceDue: string;
  firmwareUpdatePending: boolean;
  operationalStatus: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

