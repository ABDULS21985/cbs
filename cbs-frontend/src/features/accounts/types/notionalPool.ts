// Auto-generated from backend entities

export interface NotionalPoolMember {
  id: number;
  poolId: number;
  accountId: number;
  memberName: string;
  accountCurrency: string;
  fxRateToBase: number;
  currentBalance: number;
  balanceInBase: number;
  interestAllocationPct: number;
  isActive: boolean;
  createdAt: string;
}

