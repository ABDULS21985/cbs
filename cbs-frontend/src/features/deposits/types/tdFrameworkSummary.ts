// Auto-generated from backend entities

export interface TdFrameworkSummary {
  id: number;
  agreementId: number;
  snapshotDate: string;
  activeDeposits: number;
  totalPrincipal: number;
  totalAccruedInterest: number;
  weightedAvgRate: number;
  weightedAvgTenorDays: number;
  maturingNext30Days: number;
  maturingNext60Days: number;
  maturingNext90Days: number;
  expectedRolloverPct: number;
  concentrationPct: number;
}

