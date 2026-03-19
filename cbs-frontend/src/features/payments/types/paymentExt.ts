// Auto-generated from backend entities

export interface PaymentRail {
  id: number;
  railCode: string;
  railName: string;
  railType: string;
  provider: string;
  supportedCurrencies: string[];
  supportedCountries: string[];
  maxAmount: number;
  minAmount: number;
  flatFee: number;
  percentageFee: number;
  feeCurrency: string;
  settlementSpeed: string;
  avgProcessingMs: number;
  operatingHours: string;
  isAvailable: boolean;
  uptimePct: number;
  lastHealthCheck: string;
  priorityRank: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export interface PaymentRoutingRule {
  id: number;
  ruleName: string;
  rulePriority: number;
  sourceCountry: string;
  destinationCountry: string;
  currencyCode: string;
  minAmount: number;
  maxAmount: number;
  paymentType: string;
  channel: string;
  customerSegment: string;
  preferredRailCode: string;
  fallbackRailCode: string;
  optimizeFor: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

