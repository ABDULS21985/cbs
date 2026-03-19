export type CustomerType =
  | 'INDIVIDUAL'
  | 'SOLE_PROPRIETOR'
  | 'SME'
  | 'CORPORATE'
  | 'TRUST'
  | 'GOVERNMENT'
  | 'NGO';

export type CustomerStatus =
  | 'PROSPECT'
  | 'ACTIVE'
  | 'DORMANT'
  | 'SUSPENDED'
  | 'CLOSED'
  | 'DECEASED';

export type CustomerRiskRating =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'VERY_HIGH'
  | 'PEP'
  | 'SANCTIONED';

export type CustomerKycStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED';

export interface CustomerAddress {
  id: number;
  addressType: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  district?: string | null;
  landmark?: string | null;
  isPrimary?: boolean | null;
}

export interface CustomerIdentification {
  id: number;
  idType: string;
  idNumber: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  issuingAuthority?: string | null;
  issuingCountry?: string | null;
  isPrimary?: boolean | null;
  isVerified?: boolean | null;
  verifiedAt?: string | null;
  documentUrl?: string | null;
  expired?: boolean | null;
}

export interface CustomerContact {
  id: number;
  contactType: string;
  contactValue: string;
  label?: string | null;
  isPrimary?: boolean | null;
  isVerified?: boolean | null;
}

export interface CustomerRelationship {
  id: number;
  relationshipType: string;
  relatedCustomerId: number;
  relatedCustomerCifNumber?: string | null;
  relatedCustomerDisplayName?: string | null;
  ownershipPercentage?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
}

export interface CustomerNote {
  id: number;
  noteType: string;
  subject?: string | null;
  content: string;
  isPinned?: boolean | null;
  createdAt?: string | null;
  createdBy?: string | null;
}

export interface Customer {
  id: number;
  customerNumber: string;
  fullName: string;
  type: CustomerType;
  status: CustomerStatus;
  riskRating?: CustomerRiskRating | null;
  email?: string | null;
  phone?: string | null;
  branchCode?: string | null;
  title?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  registeredName?: string | null;
  tradingName?: string | null;
  registrationNumber?: string | null;
  registrationDate?: string | null;
  taxId?: string | null;
  preferredLanguage?: string | null;
  preferredChannel?: string | null;
  relationshipManager?: string | null;
  onboardedChannel?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  addresses: CustomerAddress[];
  identifications: CustomerIdentification[];
  contacts: CustomerContact[];
  relationships: CustomerRelationship[];
  notes: CustomerNote[];
  homeAddress?: string | null;
  kycStatus: CustomerKycStatus;
  kycExpiryDate?: string | null;

  // Optional UI-enrichment fields (may not always be in the backend response)
  segment?: string | null;
  branchName?: string | null;
  totalBalance?: number | null;
  dateOpened?: string | null;
  bvn?: string | null;
  nin?: string | null;
  employerName?: string | null;
  occupation?: string | null;
  riskScore?: number | null;
  behavioralTags?: string[] | null;
  lifecycleStage?: string | null;
  totalAccounts?: number | null;
  totalLoans?: number | null;
  totalCards?: number | null;
  openCases?: number | null;
  totalRelationshipValue?: number | null;
  customerSince?: string | null;
  subType?: string | null;
  metadata?: Record<string, unknown> | null;
  profilePhotoUrl?: string | null;
  phoneSecondary?: string | null;
  industryCode?: string | null;
  sectorCode?: string | null;
}

export interface CustomerListItem {
  id: number;
  customerNumber: string;
  fullName: string;
  type: CustomerType;
  status: CustomerStatus;
  riskRating?: CustomerRiskRating | null;
  phone?: string | null;
  email?: string | null;
  branchCode?: string | null;
  createdAt?: string | null;

  // Optional UI-enrichment fields
  segment?: string | null;
  totalBalance?: number | null;
  branchName?: string | null;
  dateOpened?: string | null;
}

export interface CustomerFilters {
  search?: string;
  type?: CustomerType | '';
  status?: CustomerStatus | '';
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface CustomerCounts {
  total: number;
  active: number;
  dormant: number;
  suspended: number;
  closed: number;
  newMtd: number;
}

export interface CustomerAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  status: string;
  currency: string;
  availableBalance: number;
  ledgerBalance: number;
  dateOpened?: string | null;
  productName?: string | null;
}

export interface CustomerLoan {
  id: number;
  loanNumber: string;
  productName: string;
  disbursedAmount: number;
  outstandingBalance: number;
  dpd: number;
  status: string;
  disbursedDate?: string | null;
  maturityDate?: string | null;
}

export interface CustomerCard {
  id: number;
  maskedPan: string;
  scheme: string;
  cardType: string;
  status: string;
  expiryMonth: number;
  expiryYear: number;
  spendLimit?: number | null;
  currency: string;
}

export interface CustomerDocument {
  id: number;
  documentType: string;
  documentName: string;
  documentNumber: string;
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED';
  uploadedAt?: string | null;
  expiryDate?: string | null;
  url?: string | null;
}

export interface CustomerCase {
  id: number;
  caseNumber: string;
  caseType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  slaDeadline?: string | null;
  assignedTo?: string | null;
  openedAt: string;
}

export interface CustomerTransaction {
  id: number;
  transactionRef: string;
  accountNumber?: string | null;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  description: string;
  transactionDate: string;
  status: string;
}

export interface CustomerCommunication {
  id: number;
  channel: string;
  subject: string;
  status: string;
  sentAt: string;
  template?: string | null;
}

export interface CustomerAuditChange {
  field: string;
  from: string;
  to: string;
}

export interface CustomerAuditEntry {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string | null;
  changes?: CustomerAuditChange[];
}

export interface OnboardingFormData {
  customerType?: CustomerType;
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
  branchCode?: string;
}

export interface CustomerSegment {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  segmentType: string;
  priority: number;
  isActive: boolean;
  colorCode?: string | null;
  icon?: string | null;
}

export interface BvnVerifyResult {
  status: 'VERIFIED' | 'FAILED' | 'PENDING' | 'EXPIRED_DOCUMENT' | 'MISMATCH';
  verificationProvider?: string | null;
  verificationReference?: string | null;
  failureReason?: string | null;
  verifiedAt?: string | null;
}

export interface KycStats {
  total: number;
  verified: number;
  expired: number;
  pending: number;
}
