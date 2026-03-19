// Auto-generated from backend entities

export interface FtpAllocation {
  id: number;
  allocationDate: string;
  entityType: string;
  entityId: number;
  entityRef: string;
  currencyCode: string;
  averageBalance: number;
  actualRate: number;
  ftpRate: number;
  spread: number;
  interestIncomeExpense: number;
  ftpCharge: number;
  netMargin: number;
  createdAt: string;
  version: number;
}

export interface FtpRateCurve {
  id: number;
  curveName: string;
  currencyCode: string;
  effectiveDate: string;
  tenorDays: number;
  rate: number;
  createdAt: string;
}

