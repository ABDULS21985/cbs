// Auto-generated from backend entities

export type BranchType = 'HEAD_OFFICE' | 'REGIONAL' | 'BRANCH' | 'SUB_BRANCH' | 'AGENCY' | 'DIGITAL';

export interface Branch {
  id: number;
  branchCode: string;
  branchName: string;
  branchType: BranchType;
  parentBranchCode: string;
  regionCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  email: string;
  managerName: string;
  managerEmployeeId: string;
  operatingHours: string;
  servicesOffered: string[];
  currencyCode: string;
  isActive: boolean;
  openedDate: string;
  closedDate?: string;
  metadata: Record<string, unknown>;
}

