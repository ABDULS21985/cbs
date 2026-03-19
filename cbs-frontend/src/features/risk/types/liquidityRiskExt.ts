// Auto-generated from backend entities

export interface LiquidityMetric {
  id: number;
  metricDate: string;
  currency: string;
  hqlaLevel1: number;
  hqlaLevel2a: number;
  hqlaLevel2b: number;
  totalHqla: number;
  netCashOutflows30d: number;
  lcrRatio: number;
  availableStableFunding: number;
  requiredStableFunding: number;
  nsfrRatio: number;
  stressLcrModerate: number;
  stressLcrSevere: number;
  survivalDaysModerate: number;
  survivalDaysSevere: number;
  top10DepositorPct: number;
  wholesaleFundingPct: number;
  lcrLimit: number;
  nsfrLimit: number;
  lcrBreach: boolean;
  nsfrBreach: boolean;
  createdAt: string;
}

