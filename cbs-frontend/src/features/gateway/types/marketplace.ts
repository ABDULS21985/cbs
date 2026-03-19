// Auto-generated from backend entities

export interface MarketplaceApiProduct {
  id: number;
  productCode: string;
  productName: string;
  productCategory: string;
  apiVersion: string;
  description: string;
  documentationUrl: string;
  basePath: string;
  supportedMethods: string[];
  rateLimitTier: string;
  rateLimitPerMin: number;
  pricingModel: string;
  pricePerCall: number;
  monthlyPrice: number;
  sandboxAvailable: boolean;
  requiresApproval: boolean;
  status: string;
  publishedAt: string;
  deprecatedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceSubscription {
  id: number;
  subscriptionId: string;
  apiProductId: number;
  subscriberClientId: number;
  subscriberName: string;
  subscriberEmail: string;
  planTier: string;
  apiKeyHash: string;
  monthlyCallLimit: number;
  callsThisMonth: number;
  billingStartDate: string;
  status: string;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceUsageLog {
  id: number;
  subscriptionId: number;
  apiProductId: number;
  endpointPath: string;
  httpMethod: string;
  responseCode: number;
  responseTimeMs: number;
  requestSizeBytes: number;
  responseSizeBytes: number;
  ipAddress: string;
  createdAt: string;
}

