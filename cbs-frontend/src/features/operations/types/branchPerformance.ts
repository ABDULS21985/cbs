// Auto-generated from backend entities

export interface BranchPerformance {
  id: number;
  branchId: number;
  periodType: string;
  periodDate: string;
  totalDeposits: number;
  totalLoans: number;
  totalAssets: number;
  depositGrowthPct: number;
  loanGrowthPct: number;
  interestIncome: number;
  feeIncome: number;
  totalRevenue: number;
  operatingCost: number;
  netProfit: number;
  costToIncomeRatio: number;
  returnOnAssets: number;
  totalCustomers: number;
  newCustomers: number;
  closedCustomers?: number;
  activeCustomers: number;
  dormantCustomers: number;
  customerRetentionPct: number;
  avgRevenuePerCustomer: number;
  totalTransactions: number;
  digitalAdoptionPct: number;
  avgQueueWaitMinutes: number;
  customerSatisfactionScore: number;
  staffCount: number;
  revenuePerStaff: number;
  facilityUtilizationPct: number;
  nplRatioPct: number;
  overdueAccountsPct: number;
  fraudIncidentCount: number;
  complianceFindingsCount: number;
  ranking: number;
  status: string;
}

