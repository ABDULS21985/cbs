// Auto-generated from backend entities

export interface ChartOfAccounts {
  id: number;
  glCode: string;
  glName: string;
  glCategory: GlCategory;
  glSubCategory: string;
  parentGlCode: string;
  levelNumber: number;
  isHeader: boolean;
  isPostable: boolean;
  currencyCode: string;
  isMultiCurrency: boolean;
  branchCode: string;
  isInterBranch: boolean;
  normalBalance: NormalBalance;
  allowManualPosting: boolean;
  requiresCostCentre: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  version: number;
}

export interface GlBalance {
  id: number;
  glCode: string;
  branchCode: string;
  currencyCode: string;
  balanceDate: string;
  openingBalance: number;
  debitTotal: number;
  creditTotal: number;
  closingBalance: number;
  transactionCount: number;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

