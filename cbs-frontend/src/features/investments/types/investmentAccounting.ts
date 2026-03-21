// Auto-generated from backend entities

export type Ifrs9Classification = 'AMORTISED_COST' | 'FVOCI' | 'FVTPL';

export interface InvestmentPortfolio {
  id: number;
  portfolioCode: string;
  portfolioName: string;
  ifrs9Classification: Ifrs9Classification;
  businessModel: string;
  assetGlCode: string;
  incomeGlCode: string;
  unrealisedGlCode: string;
  impairmentGlCode: string;
  maxPortfolioSize: number;
  maxSingleIssuerPct: number;
  maxSingleSecurityPct: number;
  allowedSecurityTypes: string[];
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

export interface InvestmentValuation {
  id: number;
  holdingId: number;
  portfolioCode: string;
  valuationDate: string;
  ifrs9Classification: Ifrs9Classification;
  amortisedCost: number;
  fairValue: number;
  carryingAmount: number;
  interestIncome: number;
  amortisationAmount: number;
  unrealisedGainLoss: number;
  realisedGainLoss: number;
  eclStage: number;
  eclAmount: number;
  eclMovement: number;
  ociReserve: number;
  ociMovement: number;
  journalId: number;
  createdAt: string;
  version: number;
}

