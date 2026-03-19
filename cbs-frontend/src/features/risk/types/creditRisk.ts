export interface CreditRiskStats {
  totalExposure: number;
  nplAmount: number;
  nplRatio: number;        // percent
  provisionCoverage: number; // percent
  avgPd: number;           // percent
  avgLgd: number;          // percent
  currency: string;
}

export interface RatingDistributionItem {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;           // 'Excellent', 'Good', 'Fair', 'Watch', 'Default'
  count: number;
  exposure: number;
}

export interface NplTrendPoint {
  date: string;
  nplRatio: number;
  regulatoryLimit: number; // always 5
}

export interface ConcentrationItem {
  sector: string;
  exposure: number;
  pct: number;
  count: number;
}

export interface SingleObligor {
  rank: number;
  customerId: number;
  customerName: string;
  exposure: number;
  pctOfCapital: number;
  limit: number;           // regulatory single obligor limit
  breached: boolean;
  rating: string;
}

export interface RatingMigrationRow {
  fromGrade: string;
  toA: number;
  toB: number;
  toC: number;
  toD: number;
  toE: number;
  toDefault: number;
}

export interface Scorecard {
  id: number;
  name: string;
  type: 'RETAIL' | 'SME' | 'CORPORATE' | 'MORTGAGE';
  version: string;
  auc: number;
  gini: number;
  lastValidated: string;
  active: boolean;
}

export interface ScorecardDetail extends Scorecard {
  scoreDistribution: { bucket: string; good: number; bad: number }[];
  psi: number;             // Population Stability Index
  characteristics: { name: string; weight: number; iv: number }[];
}

export interface CreditWatchItem {
  id: number;
  customerId: number;
  customerName: string;
  rating: string;
  exposure: number;
  addedDate: string;
  reason: string;
  reviewDate: string;
  status: 'WATCH' | 'ESCALATED' | 'RESOLVED';
}
