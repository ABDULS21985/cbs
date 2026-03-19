// Auto-generated from backend entities

export interface PfmSnapshot {
  id: number;
  customerId: number;
  snapshotDate: string;
  snapshotType: string;
  totalIncome: number;
  salaryIncome: number;
  investmentIncome: number;
  otherIncome: number;
  totalExpenses: number;
  expenseBreakdown: Record<string, unknown>;
  savingsRate: number;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  financialHealthScore: number;
  healthFactors: Record<string, unknown>;
  insights: Record<string, unknown>;
  currency: string;
  createdAt: string;
}

