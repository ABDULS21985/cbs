// Auto-generated from backend entities

export interface BusinessContribution {
  id: number;
  reportCode: string;
  periodType: string;
  periodDate: string;
  businessUnit: string;
  businessUnitName: string;
  productFamily: string;
  region: string;
  branchId: number;
  currency: string;
  interestIncome: number;
  feeIncome: number;
  tradingIncome: number;
  otherIncome: number;
  totalRevenue: number;
  revenueContributionPct: number;
  costOfFunds: number;
  operatingExpense: number;
  provisionExpense: number;
  totalCost: number;
  costContributionPct: number;
  grossMargin: number;
  operatingProfit: number;
  netProfit: number;
  profitContributionPct: number;
  returnOnEquity: number;
  returnOnAssets: number;
  costToIncomeRatio: number;
  avgAssets: number;
  avgDeposits: number;
  avgLoans: number;
  customerCount: number;
  transactionCount: number;
  rwaAmount: number;
  capitalAllocated: number;
  returnOnRwa: number;
  benchmark: Record<string, unknown>;
  status: string;
}

