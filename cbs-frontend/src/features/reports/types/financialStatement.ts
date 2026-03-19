// Auto-generated from backend entities

export interface FinancialStatement {
  id: number;
  statementCode: string;
  customerId: number;
  statementType: string;
  reportingPeriod: string;
  periodStartDate: string;
  periodEndDate: string;
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  totalRevenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  auditorName: string;
  auditOpinion: string;
  sourceDocumentRef: string;
  notes: string;
  status: string;
}

export interface StatementRatio {
  id: number;
  statementId: number;
  ratioCategory: string;
  ratioName: string;
  ratioValue: number;
  benchmarkValue: number;
  rating: string;
  createdAt: string;
}

