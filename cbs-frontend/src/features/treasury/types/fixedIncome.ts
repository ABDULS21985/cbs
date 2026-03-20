// Auto-generated from backend entities

export interface SecurityHolding {
  id: number;
  holdingRef: string;
  securityType: string;
  isinCode: string;
  securityName: string;
  issuerName: string;
  issuerType: string;
  faceValue: number;
  units: number;
  purchasePrice: number;
  purchaseYield: number;
  cleanPrice: number;
  dirtyPrice: number;
  marketPrice: number;
  currencyCode: string;
  couponRate: number;
  couponFrequency: string;
  dayCountConvention: string;
  nextCouponDate: string;
  purchaseDate: string;
  settlementDate: string;
  maturityDate: string;
  accruedInterest: number;
  lastAccrualDate: string;
  amortisedCost: number;
  premiumDiscount: number;
  cumulativeAmortisation: number;
  mtmValue: number;
  unrealisedGainLoss: number;
  lastMtmDate: string;
  portfolioCode: string;
  dealId: number;
  accountId: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

