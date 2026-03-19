export interface LeaseContract {
  id: number;
  leaseNumber: string;
  customerId: number;
  customerName: string;
  assetDescription: string;
  assetType: string;
  assetValue: number;
  rouAsset: number;
  leaseLiability: number;
  monthlyPayment: number;
  remainingMonths: number;
  status: string;
  currency: string;
  // Asset detail
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  condition?: string;
  location?: string;
  // IFRS 16
  monthlyDepreciation: number;
  commencementDate: string;
  endDate: string;
}

export interface AmortizationRow {
  month: number;
  date: string;
  openingLiability: number;
  payment: number;
  interestCharge: number;
  principalRepayment: number;
  closingLiability: number;
  rouAsset: number;
  depreciation: number;
}
