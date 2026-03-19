// Mirrors backend entity: com.cbs.notionalpool.entity.NotionalPool

export interface NotionalPool {
  id: number;
  poolCode: string;
  poolName: string;
  poolType: 'SINGLE_CURRENCY' | 'MULTI_CURRENCY' | 'INTEREST_OPTIMIZATION' | 'HYBRID';
  customerId: number;
  baseCurrency: string;
  interestCalcMethod: 'NET_BALANCE' | 'ADVANTAGE_RATE' | 'TIERED' | 'BLENDED';
  creditRate: number | null;
  debitRate: number | null;
  advantageSpread: number | null;
  notionalLimit: number | null;
  individualDebitLimit: number | null;
  lastCalcDate: string | null;
  netPoolBalance: number | null;
  totalCreditBalances: number | null;
  totalDebitBalances: number | null;
  interestBenefitMtd: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mirrors backend entity: com.cbs.notionalpool.entity.NotionalPoolMember

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

// Mirrors response from POST /{poolCode}/calculate

export interface NotionalPoolCalcResult {
  pool_code: string;
  net_balance: number;
  total_credit: number;
  total_debit: number;
  daily_interest_benefit: number;
  members: number;
}
