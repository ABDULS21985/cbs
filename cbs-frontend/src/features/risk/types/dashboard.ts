export interface RiskAppetite {
  riskType: 'CREDIT' | 'MARKET' | 'OPERATIONAL' | 'LIQUIDITY';
  label: string;
  current: number;   // percent of limit used
  limit: number;     // always 100 (for display)
  status: 'GREEN' | 'AMBER' | 'RED';
}

export interface RiskHeatmapCell {
  likelihood: 'RARE' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'CERTAIN';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  count: number;
  risks: string[]; // risk names
}

export interface KriIndicator {
  name: string;
  value: number;
  unit: string;       // '%', '₦M', etc.
  limit: number;
  status: 'GREEN' | 'AMBER' | 'RED';
  trend: number[];    // 12 data points for sparkline
}

export interface RiskAlert {
  id: number;
  severity: 'RED' | 'AMBER' | 'GREEN';
  message: string;
  module: string;   // 'aml' | 'ecl' | 'liquidity' | etc.
  timestamp: string;
}

export interface RiskLimit {
  riskType: string;
  metric: string;
  current: number;
  limit: number;
  utilizationPct: number;
  breached: boolean;
  trend: 'UP' | 'DOWN' | 'FLAT';
}
