export interface Customer {
  id: number;
  customerNumber: string;
  fullName: string;
  email: string;
  phone: string;
  type: 'INDIVIDUAL' | 'CORPORATE' | 'JOINT';
  subType?: 'REGULAR' | 'MINOR' | 'NON_RESIDENT';
  status: 'ACTIVE' | 'DORMANT' | 'SUSPENDED' | 'CLOSED';
  segment: 'PREMIUM' | 'STANDARD' | 'MICRO' | 'SME' | 'CORPORATE';
  branchId: number;
  branchName: string;
  totalBalance: number;
  dateOpened: string;
  // KYC
  kycStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED';
  kycExpiryDate?: string;
  bvn?: string; // masked
  nin?: string; // masked
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  homeAddress?: string;
  employerName?: string;
  occupation?: string;
  riskScore?: number;
  riskRating?: 'LOW' | 'MEDIUM' | 'HIGH';
  behavioralTags?: string[];
  lifecycleStage?: 'ONBOARDED' | 'GROWING' | 'MATURE' | 'AT_RISK' | 'CHURNED';
  totalAccounts?: number;
  totalLoans?: number;
  totalCards?: number;
  openCases?: number;
  totalRelationshipValue?: number;
  customerSince?: string;
}

export interface CustomerListItem {
  id: number;
  customerNumber: string;
  fullName: string;
  type: Customer['type'];
  status: Customer['status'];
  segment: Customer['segment'];
  phone: string;
  totalBalance: number;
  branchName: string;
  dateOpened: string;
}

export interface CustomerFilters {
  search?: string;
  type?: string;
  status?: string;
  segment?: string;
  branchId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CustomerCounts {
  total: number;
  active: number;
  dormant: number;
  newMtd: number;
}

export interface CustomerAccount {
  id: number;
  accountNumber: string;
  accountType: string;
  status: string;
  currency: string;
  availableBalance: number;
  ledgerBalance: number;
  dateOpened: string;
}

export interface CustomerLoan {
  id: number;
  loanNumber: string;
  productName: string;
  disbursedAmount: number;
  outstandingBalance: number;
  dpd: number;
  status: string;
  disbursedDate: string;
  maturityDate: string;
}

export interface CustomerCard {
  id: number;
  maskedPan: string;
  scheme: 'VISA' | 'MASTERCARD' | 'VERVE';
  cardType: string;
  status: string;
  expiryMonth: number;
  expiryYear: number;
  spendLimit?: number;
  currency: string;
}

export interface CustomerDocument {
  id: number;
  documentType: string;
  documentName: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  uploadedAt: string;
  expiryDate?: string;
  url?: string;
}

export interface CustomerCase {
  id: number;
  caseNumber: string;
  caseType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  slaDeadline?: string;
  assignedTo?: string;
  openedAt: string;
}

export interface CustomerTransaction {
  id: number;
  transactionRef: string;
  accountNumber: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  description: string;
  transactionDate: string;
  status: string;
}

export interface CustomerCommunication {
  id: number;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  subject: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  sentAt: string;
  template?: string;
}

export interface OnboardingFormData {
  customerType?: 'INDIVIDUAL' | 'CORPORATE' | 'JOINT';
  subType?: string;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  stateOfOrigin?: string;
  motherMaidenName?: string;
  residentialAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  sameAsMailing?: boolean;
  phone?: string;
  altPhone?: string;
  email?: string;
  preferredComm?: string;
  idType?: string;
  idNumber?: string;
  idExpiry?: string;
  bvn?: string;
  bvnVerified?: boolean;
  employmentStatus?: string;
  employerName?: string;
  jobTitle?: string;
  monthlyIncomeRange?: string;
  sourceOfFunds?: string;
  accountProduct?: string;
  currency?: string;
  initialDeposit?: number;
  requestDebitCard?: boolean;
  acceptTerms?: boolean;
}

export interface CustomerSegment {
  id: string;
  name: string;
  code: string;
  count: number;
  totalBalance: number;
  growthPct: number;
  avgBalance: number;
  avgProducts: number;
  avgRevenue: number;
}

export interface BvnVerifyResult {
  matched: boolean;
  score: number;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  phone?: string;
}

export interface KycStats {
  pending: number;
  expiringIn30: number;
  overdue: number;
  flagged: number;
}
