// Auto-generated from backend entities

export interface LeaseContract {
  id: number;
  leaseNumber: string;
  customerId: number;
  accountId: number;
  leaseType: string;
  ifrs16Classification: string;
  assetCategory: string;
  assetDescription: string;
  assetSerialNumber: string;
  assetMakeModel: string;
  assetYear: number;
  assetLocation: string;
  assetFairValue: number;
  residualValue: number;
  usefulLifeMonths: number;
  depreciationMethod: string;
  principalAmount: number;
  currentBalance: number;
  currency: string;
  implicitRate: number;
  incrementalBorrowingRate: number;
  termMonths: number;
  paymentFrequency: string;
  periodicPayment: number;
  advancePayments: number;
  securityDeposit: number;
  purchaseOptionPrice: number;
  rouAssetAmount: number;
  leaseLiability: number;
  accumulatedDepreciation: number;
  interestExpenseYtd: number;
  insuranceRequired: boolean;
  maintenanceIncluded: boolean;
  status: string;
  commencementDate: string;
  maturityDate: string;
  earlyTerminationFee: number;
  createdAt: string;
  updatedAt?: string;
}

