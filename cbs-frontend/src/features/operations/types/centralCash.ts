// Auto-generated from backend entities

export interface CentralCashPosition {
  id: number;
  positionDate: string;
  currency: string;
  clearingInflows: number;
  customerDeposits: number;
  interbankInflows: number;
  cbBorrowing: number;
  clearingOutflows: number;
  customerWithdrawals: number;
  interbankOutflows: number;
  cbRepayment: number;
  openingBalance: number;
  netMovement: number;
  closingBalance: number;
  reserveRequirement: number;
  excessReserve: number;
  status: string;
  createdAt: string;
}

