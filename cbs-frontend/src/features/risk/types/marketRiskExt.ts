// Auto-generated from backend entities

export interface MarketRiskPosition {
  id: number;
  positionDate: string;
  riskType: string;
  portfolio: string;
  currency: string;
  var1d95: number;
  var1d99: number;
  var10d99: number;
  varMethod: string;
  stressLossModerate: number;
  stressLossSevere: number;
  stressScenario: string;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
  varLimit: number;
  varUtilizationPct: number;
  limitBreach: boolean;
  dailyPnl: number;
  mtdPnl: number;
  ytdPnl: number;
  createdAt: string;
}

