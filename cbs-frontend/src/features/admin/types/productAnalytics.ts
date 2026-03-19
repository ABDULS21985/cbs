// Auto-generated from backend entities

export interface ProductPerformanceSnapshot {
  id: number;
  snapshotCode: string;
  productCode: string;
  productName: string;
  productFamily: string;
  periodType: string;
  periodDate: string;
  currency: string;
  activeAccounts: number;
  newAccountsPeriod: number;
  closedAccountsPeriod?: number;
  totalBalance: number;
  interestIncome: number;
  feeIncome: number;
  totalRevenue: number;
  costOfFunds: number;
  operatingCost: number;
  provisionCharge: number;
  netMargin: number;
  returnOnProductPct: number;
  costToIncomePct: number;
  nplRatioPct: number;
  avgRiskWeightPct: number;
}

