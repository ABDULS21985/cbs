export type CollateralType = 'PROPERTY' | 'VEHICLE' | 'EQUIPMENT' | 'CASH' | 'SHARES' | 'DEBENTURE' | 'GUARANTEE';

export interface Collateral {
  id: number;
  collateralNumber: string;
  type: CollateralType;
  description: string;
  owner: string;
  currentValue: number;
  valuationDate: string;
  currency: string;
  linkedLoans: { loanNumber: string; outstanding: number }[];
  coverageRatio: number;
  insuranceStatus: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'NONE';
  insuranceExpiry?: string;
  perfectionStatus: 'PERFECTED' | 'IN_PROGRESS' | 'NOT_STARTED';
  location?: string;
  registrationRef?: string;
  valuer?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  filingReference?: string;
  haircut: number;
  adjustedValue: number;
}

export interface ValuationHistoryItem {
  id: number;
  date: string;
  valuer: string;
  method: string;
  value: number;
  changeFromPrevious?: number;
}

export interface CollateralFilters {
  search?: string;
  type?: string;
  perfectionStatus?: string;
  insuranceStatus?: string;
  page?: number;
  size?: number;
}
