// Auto-generated from backend entities

export interface PublicOfferingDetail {
  id: number;
  dealId: number;
  offeringType: string;
  exchangeMarket: string;
  sharesOffered: number;
  parValue: number;
  offerPrice: number;
  priceRange: string;
  greenShoeOption: boolean;
  greenShoeShares: number;
  lockUpPeriodDays: number;
  prospectusSubmittedDate: string;
  prospectusApprovalDate: string;
  secApprovalRef: string;
  nseApprovalRef: string;
  applicationOpenDate: string;
  applicationCloseDate?: string;
  basisOfAllotment: string;
  refundStartDate: string;
  listingDate: string;
  openingPrice: number;
  closingPriceDay1: number;
  pricePerformance30Days: number;
  retailAllocationPct: number;
  institutionalAllocationPct: number;
  totalApplications: number;
  totalAmountReceived: number;
  status: string;
}

