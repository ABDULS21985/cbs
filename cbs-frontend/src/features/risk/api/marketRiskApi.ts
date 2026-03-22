import { apiGet } from '@/lib/api';

export interface VarStats {
  portfolioVar95: number;
  expectedShortfall975: number;
  varLimit: number;
  utilizationPct: number;
  capitalCharge: number;
  worstStressLoss: number;
  currency: string;
}

export interface VarTrendPoint {
  date: string;
  var95: number;
  actualPnl: number;
  varBreached: boolean;
}

export interface VarByRiskFactor {
  factor: string;
  standaloneVar: number;
  diversifiedVar: number;
}

export interface StressTestResult {
  id: number;
  scenario: string;
  description: string;
  type: 'HISTORICAL' | 'HYPOTHETICAL';
  pnlImpact: number;
  capitalImpact: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
}

export interface SensitivityRow {
  riskFactorShift: string;
  pnlImpact: number;
}

export interface BacktestResult {
  totalDays: number;
  exceptions: number;
  zone: 'GREEN' | 'YELLOW' | 'RED';
}

export interface LiquidityRatios {
  lcr: number;
  lcrMin: number;
  nsfr: number;
  nsfrMin: number;
  cashReserve: number;
  cashReserveReq: number;
  netCashOutflows30d?: number;
}

export interface CashflowBucket {
  bucket: string;
  inflows: number;
  outflows: number;
  netGap: number;
  cumulativeGap: number;
}

export interface HqlaItem {
  category: string;
  level: 'LEVEL_1' | 'LEVEL_2A' | 'LEVEL_2B';
  grossValue: number;
  haircut: number;
  netValue: number;
}

export interface TopDepositor {
  name: string;
  amount: number;
  pctOfTotal: number;
}

export interface FundingSource {
  source: string;
  amount: number;
  pctOfTotal: number;
}

export interface LiquidityStressPoint {
  day: number;
  normal: number;
  mildStress: number;
  severeStress: number;
}

export const marketRiskApi = {
  getVarStats: () => apiGet<VarStats>('/api/v1/risk/market/var-stats'),
  getVarTrend: (days?: number) => apiGet<VarTrendPoint[]>('/api/v1/risk/market/var-trend', { days: days || 60 }),
  getVarByRiskFactor: () => apiGet<VarByRiskFactor[]>('/api/v1/risk/market/var-by-factor'),
  getStressTests: () => apiGet<StressTestResult[]>('/api/v1/risk/market/stress-tests'),
  getSensitivities: () => apiGet<SensitivityRow[]>('/api/v1/risk/market/sensitivities'),
  getBacktestResult: () => apiGet<BacktestResult>('/api/v1/risk/market/backtest'),
  getLiquidityRatios: () => apiGet<LiquidityRatios>('/api/v1/risk/liquidity/ratios'),
  getCashflowLadder: () => apiGet<CashflowBucket[]>('/api/v1/risk/liquidity/cashflow-ladder'),
  getHqla: () => apiGet<HqlaItem[]>('/api/v1/risk/liquidity/hqla'),
  getTopDepositors: () => apiGet<TopDepositor[]>('/api/v1/risk/liquidity/top-depositors'),
  getFundingSources: () => apiGet<FundingSource[]>('/api/v1/risk/liquidity/funding-sources'),
  getLiquidityStress: () => apiGet<LiquidityStressPoint[]>('/api/v1/risk/liquidity/stress-projection'),
};
