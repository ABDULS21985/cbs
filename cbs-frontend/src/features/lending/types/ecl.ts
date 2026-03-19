export interface EclSummary {
  totalEcl: number;
  stage1Ecl: number;
  stage2Ecl: number;
  stage3Ecl: number;
  coverageRatio: number; // percent
  currency: string;
}

export interface StageDistributionItem {
  stage: 'Stage 1' | 'Stage 2' | 'Stage 3';
  amount: number;
  count: number;
  pct: number;
}

export interface StageMigration {
  from: string;
  to: string;
  amount: number;
}

export interface ProvisionMovementRow {
  label: string; // Opening, New loans, Migrations, Remeasure, Write-offs, Recoveries, Closing
  stage1: number;
  stage2: number;
  stage3: number;
  total: number;
  isTotal?: boolean; // for Opening and Closing rows (bold)
}

export interface PdTermStructure {
  ratingGrade: string; // AAA, AA, A, BBB, BB, B, CCC
  tenor1y: number;
  tenor3y: number;
  tenor5y: number;
  tenor10y: number;
}

export interface LgdByCollateral {
  collateralType: string;
  lgdPct: number;
  description: string;
}

export interface EadByProduct {
  product: string;
  outstanding: number;
  undrawn: number;
  ccf: number;
  ead: number;
}

export interface GlReconciliation {
  cbsEclTotal: number;
  glProvisionBalance: number;
  difference: number;
  reconciled: boolean;
}

export interface MacroScenario {
  name: 'Base' | 'Optimistic' | 'Pessimistic';
  weight: number; // percent
  gdpGrowth: number;
  inflation: number;
  ecl: number;
}

export interface EclLoan {
  id: number;
  loanNumber: string;
  customerName: string;
  outstanding: number;
  stage: 1 | 2 | 3;
  pd: number;
  lgd: number;
  ead: number;
  ecl: number;
  currency: string;
}
