// Auto-generated from backend entities

export interface CorporateLeasePortfolio {
  id: number;
  corporateCustomerId: number;
  totalLeases: number;
  activeLeases: number;
  totalRouAssetValue: number;
  totalLeaseLiability: number;
  weightedAvgTerm: number;
  weightedAvgRate: number;
  annualLeaseExpense: number;
  expiringNext90Days: number;
  expiringNext180Days: number;
  asOfDate: string;
}

