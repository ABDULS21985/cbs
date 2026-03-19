// Auto-generated from backend entities

export interface RiskContribution {
  id: number;
  contributionCode: string;
  calcDate: string;
  portfolioCode: string;
  businessUnit: string;
  positionIdentifier: string;
  positionName: string;
  riskMeasure: string;
  standaloneRisk: number;
  marginalContribution: number;
  incrementalContribution: number;
  componentContribution: number;
  contributionPct: number;
  diversificationBenefit: number;
  correlationToPortfolio: number;
  totalPortfolioRisk: number;
  status: string;
}

