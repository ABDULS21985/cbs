import { apiGet, apiPost, apiPostParams } from '@/lib/api';

// ─── Deal Types & Interfaces ─────────────────────────────────────────────────

export type DealType = 'ECM' | 'DCM';
export type DealStatus =
  | 'ORIGINATION'
  | 'STRUCTURING'
  | 'MARKETING'
  | 'PRICING'
  | 'ALLOTMENT'
  | 'SETTLED'
  | 'CANCELLED';

export type PlacementStatus = 'OPEN' | 'FUNDED' | 'CLOSED' | 'CANCELLED';
export type OfferingStatus = 'PENDING' | 'OPEN' | 'CLOSED' | 'LISTED';
export type PortfolioType = 'DISCRETIONARY' | 'ADVISORY' | 'EXECUTION_ONLY';
export type HoldingType = 'EQUITY' | 'FIXED_INCOME' | 'CASH' | 'ALTERNATIVE' | 'COMMODITY';
export type FundType = 'EQUITY' | 'FIXED_INCOME' | 'BALANCED' | 'MONEY_MARKET' | 'REAL_ESTATE';

export interface CapitalMarketsDeal {
  id: number;
  code: string;
  type: DealType;
  issuer: string;
  targetAmount: number;
  currency: string;
  tenor: string;
  status: DealStatus;
  leadManager?: string;
  coManagers?: string[];
  finalPrice?: number;
  yieldRate?: number;
  coverageRatio?: number;
  allotmentDate?: string;
  settlementDate?: string;
  totalBids?: number;
  totalAllocated?: number;
  feesEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Investor {
  id: number;
  dealId: number;
  name: string;
  bidAmount: number;
  bidPrice?: number;
  allocatedAmount?: number;
  allocationStatus?: 'PENDING' | 'ALLOCATED' | 'REJECTED';
  createdAt: string;
}

export interface PricingInput {
  finalPrice: number;
  yieldRate: number;
  allotmentDate: string;
}

export interface InvestorInput {
  name: string;
  bidAmount: number;
  bidPrice?: number;
}

export interface CreateDealInput {
  type: DealType;
  issuer: string;
  targetAmount: number;
  currency: string;
  tenor: string;
  status?: DealStatus;
}

// ─── Private Placement Interfaces ────────────────────────────────────────────

export interface PrivatePlacement {
  id: number;
  code: string;
  issuer: string;
  targetAmount: number;
  currency: string;
  instrumentType: string;
  status: PlacementStatus;
  investors?: PlacementInvestor[];
  totalFunded?: number;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementInvestor {
  id: number;
  placementCode: string;
  name: string;
  committedAmount: number;
  fundedAmount?: number;
  fundedAt?: string;
  status: 'COMMITTED' | 'FUNDED' | 'WITHDRAWN';
}

export interface CreatePlacementInput {
  issuer: string;
  targetAmount: number;
  currency: string;
  instrumentType: string;
}

export interface FundingInput {
  amount: number;
  fundedAt?: string;
  reference?: string;
}

// ─── Public Offering Interfaces ───────────────────────────────────────────────

export interface PublicOffering {
  id: number;
  dealId: number;
  issuer: string;
  offeringType: 'IPO' | 'FPO' | 'RIGHTS';
  status: OfferingStatus;
  targetAmount: number;
  currency: string;
  pricePerShare?: number;
  sharesOffered?: number;
  applicationOpen?: string;
  applicationClose?: string;
  listingDate?: string;
  oversubscriptionRatio?: number;
  createdAt: string;
}

// ─── Investment Portfolio Interfaces ─────────────────────────────────────────

export interface InvestmentPortfolio {
  id: number;
  code: string;
  customerId: number;
  customerName?: string;
  type: PortfolioType;
  name: string;
  currency: string;
  totalValue: number;
  costBasis?: number;
  benchmark?: string;
  returnYtd?: number;
  returnTotal?: number;
  manager?: string;
  inceptionDate: string;
  lastValuationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Holding {
  id: number;
  portfolioCode: string;
  instrumentCode: string;
  instrumentName: string;
  holdingType: HoldingType;
  quantity: number;
  costPrice: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  currency: string;
  weight?: number;
  createdAt: string;
}

export interface CreatePortfolioInput {
  customerId: number;
  type: PortfolioType;
  name: string;
  currency: string;
  benchmark?: string;
  manager?: string;
}

export interface AddHoldingInput {
  instrumentCode: string;
  instrumentName: string;
  holdingType: HoldingType;
  quantity: number;
  costPrice: number;
  currency: string;
}

export interface ValuationResult {
  portfolioCode: string;
  totalValue: number;
  returnYtd: number;
  valuatedAt: string;
}

// ─── Fund Interfaces ──────────────────────────────────────────────────────────

export interface Fund {
  id: number;
  code: string;
  name: string;
  type: FundType;
  currency: string;
  targetAum: number;
  currentAum: number;
  navPerUnit: number;
  inceptionNav?: number;
  ytdReturn?: number;
  inceptionReturn?: number;
  shariaCompliant: boolean;
  unitHolders?: number;
  manager?: string;
  inceptionDate: string;
  lastNavDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFundInput {
  name: string;
  type: FundType;
  currency: string;
  targetAum: number;
  shariaCompliant?: boolean;
  manager?: string;
}

export interface NavUpdateInput {
  navPerUnit: number;
  totalAum: number;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const capitalMarketsApi = {
  // Capital Markets Deals
  getPipeline: () =>
    apiGet<CapitalMarketsDeal[]>('/api/v1/capital-markets/pipeline'),
  getDeal: (code: string) =>
    apiGet<CapitalMarketsDeal>(`/api/v1/capital-markets/${code}`),
  createDeal: (input: CreateDealInput) =>
    apiPost<CapitalMarketsDeal>('/api/v1/capital-markets', input),
  priceDeal: (code: string, price: number) =>
    apiPostParams<CapitalMarketsDeal>(`/api/v1/capital-markets/${code}/pricing`, { price }),
  allotDeal: (code: string, method: string = 'PRO_RATA') =>
    apiPostParams<CapitalMarketsDeal>(`/api/v1/capital-markets/${code}/allotment`, { method }),
  settleDeal: (code: string) =>
    apiPost<CapitalMarketsDeal>(`/api/v1/capital-markets/${code}/settle`),
  addInvestor: (dealId: number, input: InvestorInput) =>
    apiPost<Investor>(`/api/v1/capital-markets/${dealId}/investors`, input),
  getInvestorBook: (dealId: number) =>
    apiGet<Investor[]>(`/api/v1/capital-markets/${dealId}/investors`),

  // Private Placements
  getActivePlacements: () =>
    apiGet<PrivatePlacement[]>('/api/v1/private-placements/active'),
  getPlacement: (code: string) =>
    apiGet<PrivatePlacement>(`/api/v1/private-placements/${code}`),
  createPlacement: (input: CreatePlacementInput) =>
    apiPost<PrivatePlacement>('/api/v1/private-placements', input),
  addPlacementInvestor: (code: string, input: InvestorInput) =>
    apiPost<PlacementInvestor>(`/api/v1/private-placements/${code}/investors`, input),
  recordFunding: (code: string, investorId: number, input: FundingInput) =>
    apiPost<PlacementInvestor>(`/api/v1/private-placements/${code}/investors/${investorId}/fund`, input),
  closePlacement: (code: string) =>
    apiPost<PrivatePlacement>(`/api/v1/private-placements/${code}/close`),

  // Public Offerings
  getOffering: (id: number) =>
    apiGet<PublicOffering>(`/api/v1/public-offerings/${id}`),
  createOffering: (dealId: number, input: Partial<PublicOffering>) =>
    apiPost<PublicOffering>(`/api/v1/public-offerings/${dealId}`, input),
  openOffering: (id: number) =>
    apiPost<PublicOffering>(`/api/v1/public-offerings/${id}/open`),
  closeOffering: (id: number) =>
    apiPost<PublicOffering>(`/api/v1/public-offerings/${id}/close`),

  // Investment Portfolios
  getPortfoliosByCustomer: (customerId: number) =>
    apiGet<InvestmentPortfolio[]>(`/api/v1/investment-portfolios/customer/${customerId}`),
  getPortfolio: (code: string) =>
    apiGet<InvestmentPortfolio>(`/api/v1/investment-portfolios/${code}`),
  getHoldings: (code: string) =>
    apiGet<Holding[]>(`/api/v1/investment-portfolios/${code}/holdings`),
  createPortfolio: (input: CreatePortfolioInput) =>
    apiPost<InvestmentPortfolio>('/api/v1/investment-portfolios', input),
  addHolding: (code: string, input: AddHoldingInput) =>
    apiPost<Holding>(`/api/v1/investment-portfolios/${code}/holdings`, input),
  valuate: (code: string) =>
    apiPost<ValuationResult>(`/api/v1/investment-portfolios/${code}/valuate`),

  // Funds
  getFundsByType: (type: FundType) =>
    apiGet<Fund[]>(`/api/v1/funds/type/${type}`),
  getFundsByAum: () =>
    apiGet<Fund[]>('/api/v1/funds/by-aum'),
  getSharia: () =>
    apiGet<Fund[]>('/api/v1/funds/sharia-compliant'),
  createFund: (input: CreateFundInput) =>
    apiPost<Fund>('/api/v1/funds', input),
  updateNav: (code: string, input: NavUpdateInput) =>
    apiPost<Fund>(`/api/v1/funds/${code}/nav`, input),
};
