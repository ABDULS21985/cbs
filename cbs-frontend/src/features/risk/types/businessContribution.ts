// Aligned with BusinessContribution entity

export interface BusinessContribution {
  id: number;
  reportCode: string;
  periodType: string;   // MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL
  periodDate: string;
  businessUnit: string;
  businessUnitName: string;
  productFamily: string;
  region: string;
  branchId: number | null;
  currency: string;
  // Revenue
  interestIncome: number;
  feeIncome: number;
  tradingIncome: number;
  otherIncome: number;
  totalRevenue: number;
  revenueContributionPct: number;
  // Costs
  costOfFunds: number;
  operatingExpense: number;
  provisionExpense: number;
  totalCost: number;
  costContributionPct: number;
  // Profitability
  grossMargin: number;
  operatingProfit: number;
  netProfit: number;
  profitContributionPct: number;
  // Returns
  returnOnEquity: number;
  returnOnAssets: number;
  costToIncomeRatio: number;
  // Averages
  avgAssets: number;
  avgDeposits: number;
  avgLoans: number;
  customerCount: number;
  transactionCount: number;
  // Risk-Adjusted
  rwaAmount: number;
  capitalAllocated: number;
  returnOnRwa: number;
  benchmark: Record<string, unknown> | null;
  status: string;
}
