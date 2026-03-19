import api, { apiGet, apiPost } from '@/lib/api';
import type { ApiResponse, PageMeta, PaginationParams } from '@/types/common';
import type {
  BvnVerifyResult,
  Customer,
  CustomerAccount,
  CustomerAuditChange,
  CustomerAuditEntry,
  CustomerCard,
  CustomerCase,
  CustomerCommunication,
  CustomerCounts,
  CustomerDocument,
  CustomerFilters,
  CustomerIdentification,
  CustomerListItem,
  CustomerLoan,
  CustomerSegment,
  CustomerTransaction,
  KycStats,
  OnboardingFormData,
} from '../types/customer';

interface PaginatedResult<T> {
  items: T[];
  page: PageMeta;
}

interface BackendCustomerSummary {
  id: number;
  cifNumber: string;
  customerNumber?: string;
  customerType: Customer['type'];
  type?: Customer['type'];
  status: Customer['status'];
  riskRating?: Customer['riskRating'] | null;
  displayName: string;
  fullName?: string;
  email?: string | null;
  phonePrimary?: string | null;
  phone?: string | null;
  branchCode?: string | null;
  createdAt?: string | null;
}

interface BackendCustomerDetail extends BackendCustomerSummary {
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
  createdBy?: string | null;
  updatedAt?: string | null;
  addresses?: Customer['addresses'];
  identifications?: CustomerIdentification[];
  contacts?: Customer['contacts'];
  relationships?: Customer['relationships'];
  notes?: Customer['notes'];
}

interface BackendAccountResponse {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  status: string;
  currency?: string;
  currencyCode?: string;
  availableBalance: number;
  ledgerBalance?: number;
  bookBalance?: number;
  openedDate?: string | null;
  productName?: string | null;
}

interface BackendLoanResponse {
  id: number;
  loanNumber: string;
  loanProductName?: string | null;
  disbursedAmount?: number;
  outstandingPrincipal?: number;
  daysPastDue?: number;
  status: string;
  disbursementDate?: string | null;
  maturityDate?: string | null;
}

interface BackendCardResponse {
  id: number;
  cardNumberMasked: string;
  cardScheme: string;
  cardType: string;
  status: string;
  expiryDate: string;
  dailyPosLimit?: number | null;
  currencyCode: string;
}

interface BackendCaseResponse {
  id: number;
  caseNumber: string;
  caseType: string;
  priority?: string | null;
  status: string;
  slaDueAt?: string | null;
  assignedTo?: string | null;
  createdAt: string;
}

interface BackendTransactionResponse {
  id: number;
  transactionRef: string;
  transactionType: string;
  amount: number;
  currencyCode?: string | null;
  narration?: string | null;
  createdAt?: string | null;
  postingDate?: string | null;
  status: string;
  accountNumber?: string | null;
  account?: { accountNumber?: string | null } | null;
}

interface BackendNotificationResponse {
  id: number;
  channel: string;
  subject?: string | null;
  status: string;
  sentAt?: string | null;
  createdAt: string;
  templateCode?: string | null;
  eventType?: string | null;
}

interface BackendAuditResponse {
  id: number;
  action: string;
  performedBy: string;
  eventTimestamp?: string | null;
  createdAt?: string | null;
  description?: string | null;
  changedFields?: string[] | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

interface BackendSegmentResponse {
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

function normalizeCountryCode(value?: string): string {
  if (!value) {
    return 'NGA';
  }

  const upper = value.trim().toUpperCase();
  const aliases: Record<string, string> = {
    NIGERIA: 'NGA',
    NIGERIAN: 'NGA',
    GHANA: 'GHA',
    GHANAIAN: 'GHA',
    KENYA: 'KEN',
    KENYAN: 'KEN',
    'SOUTH AFRICA': 'ZAF',
    'SOUTH AFRICAN': 'ZAF',
  };

  if (upper.length === 3) {
    return upper;
  }

  return aliases[upper] ?? upper.slice(0, 3);
}

function mapIdType(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const upper = value.trim().toUpperCase();
  const aliases: Record<string, string> = {
    NIN: 'NATIONAL_ID',
    "DRIVER'S LICENSE": 'DRIVERS_LICENSE',
    'INTERNATIONAL PASSPORT': 'PASSPORT',
    "VOTER'S CARD": 'VOTER_ID',
  };

  return aliases[upper] ?? upper.replace(/\s+/g, '_');
}

function deriveKycStatus(identifications: CustomerIdentification[]): Customer['kycStatus'] {
  if (identifications.some((item) => item.expired || (item.expiryDate ? new Date(item.expiryDate) < new Date() : false))) {
    return 'EXPIRED';
  }

  if (identifications.length > 0 && identifications.every((item) => item.isVerified)) {
    return 'VERIFIED';
  }

  return 'PENDING';
}

function buildAddressLabel(addresses: Customer['addresses']): string | undefined {
  const primary = addresses.find((address) => address.isPrimary) ?? addresses[0];
  if (!primary) {
    return undefined;
  }

  return [primary.addressLine1, primary.addressLine2, primary.city, primary.state, primary.country]
    .filter(Boolean)
    .join(', ');
}

function mapCustomerSummary(item: BackendCustomerSummary): CustomerListItem {
  return {
    id: item.id,
    customerNumber: item.customerNumber ?? item.cifNumber,
    fullName: item.fullName ?? item.displayName,
    type: item.type ?? item.customerType,
    status: item.status,
    riskRating: item.riskRating ?? null,
    phone: item.phone ?? item.phonePrimary ?? null,
    email: item.email ?? null,
    branchCode: item.branchCode ?? null,
    createdAt: item.createdAt ?? null,
  };
}

function mapCustomerDetail(item: BackendCustomerDetail): Customer {
  const identifications = item.identifications ?? [];
  const addresses = item.addresses ?? [];

  return {
    id: item.id,
    customerNumber: item.customerNumber ?? item.cifNumber,
    fullName: item.fullName ?? item.displayName,
    type: item.type ?? item.customerType,
    status: item.status,
    riskRating: item.riskRating ?? null,
    email: item.email ?? null,
    phone: item.phone ?? item.phonePrimary ?? null,
    branchCode: item.branchCode ?? null,
    title: item.title ?? null,
    firstName: item.firstName ?? null,
    middleName: item.middleName ?? null,
    lastName: item.lastName ?? null,
    dateOfBirth: item.dateOfBirth ?? null,
    gender: item.gender ?? null,
    maritalStatus: item.maritalStatus ?? null,
    nationality: item.nationality ?? null,
    stateOfOrigin: item.stateOfOrigin ?? null,
    lgaOfOrigin: item.lgaOfOrigin ?? null,
    registeredName: item.registeredName ?? null,
    tradingName: item.tradingName ?? null,
    registrationNumber: item.registrationNumber ?? null,
    registrationDate: item.registrationDate ?? null,
    taxId: item.taxId ?? null,
    preferredLanguage: item.preferredLanguage ?? null,
    preferredChannel: item.preferredChannel ?? null,
    relationshipManager: item.relationshipManager ?? null,
    onboardedChannel: item.onboardedChannel ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
    createdBy: item.createdBy ?? null,
    addresses,
    identifications,
    contacts: item.contacts ?? [],
    relationships: item.relationships ?? [],
    notes: item.notes ?? [],
    homeAddress: buildAddressLabel(addresses) ?? null,
    kycStatus: deriveKycStatus(identifications),
    kycExpiryDate: identifications.map((item) => item.expiryDate).filter(Boolean).sort()[0] ?? null,
  };
}

function mapCounts(data: Record<string, number>): CustomerCounts {
  return {
    total: data.total ?? 0,
    active: data.active ?? 0,
    dormant: data.dormant ?? 0,
    suspended: data.suspended ?? 0,
    closed: data.closed ?? 0,
    newMtd: data.newMtd ?? 0,
  };
}

function mapKycStats(data: Record<string, number>): KycStats {
  return {
    total: data.total ?? 0,
    verified: data.verified ?? 0,
    expired: data.expired ?? 0,
    pending: data.pending ?? 0,
  };
}

function mapAccount(item: BackendAccountResponse): CustomerAccount {
  return {
    id: item.id,
    accountNumber: item.accountNumber,
    accountName: item.accountName,
    accountType: item.accountType,
    status: item.status,
    currency: item.currency ?? item.currencyCode ?? 'NGN',
    availableBalance: item.availableBalance ?? 0,
    ledgerBalance: item.ledgerBalance ?? item.bookBalance ?? 0,
    dateOpened: item.openedDate ?? null,
    productName: item.productName ?? null,
  };
}

function mapLoan(item: BackendLoanResponse): CustomerLoan {
  return {
    id: item.id,
    loanNumber: item.loanNumber,
    productName: item.loanProductName ?? 'Loan',
    disbursedAmount: item.disbursedAmount ?? 0,
    outstandingBalance: item.outstandingPrincipal ?? 0,
    dpd: item.daysPastDue ?? 0,
    status: item.status,
    disbursedDate: item.disbursementDate ?? null,
    maturityDate: item.maturityDate ?? null,
  };
}

function mapCard(item: BackendCardResponse): CustomerCard {
  const expiry = new Date(item.expiryDate);
  return {
    id: item.id,
    maskedPan: item.cardNumberMasked,
    scheme: item.cardScheme,
    cardType: item.cardType,
    status: item.status,
    expiryMonth: expiry.getUTCMonth() + 1,
    expiryYear: expiry.getUTCFullYear(),
    spendLimit: item.dailyPosLimit ?? null,
    currency: item.currencyCode,
  };
}

function mapCase(item: BackendCaseResponse): CustomerCase {
  return {
    id: item.id,
    caseNumber: item.caseNumber,
    caseType: item.caseType,
    priority: (item.priority?.toUpperCase() as CustomerCase['priority']) ?? 'MEDIUM',
    status: item.status,
    slaDeadline: item.slaDueAt ?? null,
    assignedTo: item.assignedTo ?? null,
    openedAt: item.createdAt,
  };
}

function mapDocument(item: CustomerIdentification): CustomerDocument {
  return {
    id: item.id,
    documentType: item.idType,
    documentName: item.idType,
    documentNumber: item.idNumber,
    status: item.expired ? 'EXPIRED' : item.isVerified ? 'VERIFIED' : 'PENDING',
    uploadedAt: item.verifiedAt ?? item.issueDate ?? null,
    expiryDate: item.expiryDate ?? null,
    url: item.documentUrl ?? null,
  };
}

function mapTransaction(item: BackendTransactionResponse): CustomerTransaction {
  const creditTypes = ['CREDIT', 'TRANSFER_IN', 'INTEREST_POSTING', 'OPENING_BALANCE', 'LIEN_RELEASE'];
  return {
    id: item.id,
    transactionRef: item.transactionRef,
    accountNumber: item.accountNumber ?? item.account?.accountNumber ?? null,
    type: creditTypes.includes(item.transactionType) ? 'CREDIT' : 'DEBIT',
    amount: item.amount ?? 0,
    currency: item.currencyCode ?? 'NGN',
    description: item.narration ?? item.transactionType.replace(/_/g, ' '),
    transactionDate: item.createdAt ?? item.postingDate ?? new Date().toISOString(),
    status: item.status,
  };
}

function mapCommunication(item: BackendNotificationResponse): CustomerCommunication {
  return {
    id: item.id,
    channel: item.channel,
    subject: item.subject ?? item.eventType ?? 'Notification',
    status: item.status,
    sentAt: item.sentAt ?? item.createdAt,
    template: item.templateCode ?? null,
  };
}

function toAuditChange(field: string, beforeState?: Record<string, unknown> | null, afterState?: Record<string, unknown> | null): CustomerAuditChange {
  return {
    field,
    from: String(beforeState?.[field] ?? ''),
    to: String(afterState?.[field] ?? ''),
  };
}

function mapAuditEntry(item: BackendAuditResponse): CustomerAuditEntry {
  const fields = item.changedFields ?? [];
  return {
    id: String(item.id),
    action: item.action.replace(/_/g, ' '),
    performedBy: item.performedBy,
    performedAt: item.eventTimestamp ?? item.createdAt ?? new Date().toISOString(),
    details: item.description ?? null,
    changes: fields.map((field) => toAuditChange(field, item.beforeState, item.afterState)),
  };
}

function mapSegment(item: BackendSegmentResponse): CustomerSegment {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? null,
    segmentType: item.segmentType,
    priority: item.priority,
    isActive: item.isActive,
    colorCode: item.colorCode ?? null,
    icon: item.icon ?? null,
  };
}

function buildOnboardingPayload(data: OnboardingFormData) {
  const country = normalizeCountryCode(data.country ?? data.nationality);

  return {
    customerType: data.customerType,
    title: data.title,
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    maritalStatus: data.maritalStatus,
    nationality: normalizeCountryCode(data.nationality),
    stateOfOrigin: data.stateOfOrigin,
    motherMaidenName: data.motherMaidenName,
    email: data.email,
    phonePrimary: data.phone,
    branchCode: import.meta.env.VITE_DEFAULT_BRANCH_CODE || 'BR001',
    onboardedChannel: 'FRONTEND',
    addresses: data.residentialAddress
      ? [
          {
            addressType: 'RESIDENTIAL',
            addressLine1: data.residentialAddress,
            city: data.city || 'Unknown',
            state: data.state || undefined,
            country,
            isPrimary: true,
          },
        ]
      : undefined,
    identifications: data.idType && data.idNumber
      ? [
          {
            idType: mapIdType(data.idType),
            idNumber: data.idNumber,
            expiryDate: data.idExpiry,
            issuingCountry: country,
            isPrimary: true,
          },
        ]
      : undefined,
    metadata: {
      accountProduct: data.accountProduct,
      employmentStatus: data.employmentStatus,
      employerName: data.employerName,
      jobTitle: data.jobTitle,
      bvn: data.bvn,
      bvnVerified: data.bvnVerified ?? false,
    },
  };
}

export const customerApi = {
  async list(filters: CustomerFilters): Promise<PaginatedResult<CustomerListItem>> {
    const response = await api.get<ApiResponse<BackendCustomerSummary[]>>('/api/v1/customers', {
      params: {
        search: filters.search,
        customerType: filters.type || undefined,
        status: filters.status || undefined,
        page: filters.page ?? 0,
        size: filters.size ?? 25,
        sort: filters.sort ?? 'createdAt',
        direction: filters.direction ?? 'desc',
      },
    });

    return {
      items: (response.data.data ?? []).map(mapCustomerSummary),
      page: response.data.page ?? { page: 0, size: filters.size ?? 25, totalElements: 0, totalPages: 0 },
    };
  },

  async counts(): Promise<CustomerCounts> {
    return mapCounts(await apiGet<Record<string, number>>('/api/v1/customers/count'));
  },

  async getById(id: number): Promise<Customer> {
    return mapCustomerDetail(await apiGet<BackendCustomerDetail>(`/api/v1/customers/${id}`));
  },

  async getAccounts(id: number): Promise<CustomerAccount[]> {
    return (await apiGet<BackendAccountResponse[]>(`/api/v1/accounts/customer/${id}`)).map(mapAccount);
  },

  async getLoans(id: number): Promise<CustomerLoan[]> {
    return (await apiGet<BackendLoanResponse[]>(`/api/v1/loans/customer/${id}`)).map(mapLoan);
  },

  async getCards(id: number): Promise<CustomerCard[]> {
    return (await apiGet<BackendCardResponse[]>(`/api/v1/cards/customer/${id}`)).map(mapCard);
  },

  async getCases(id: number): Promise<CustomerCase[]> {
    return (await apiGet<BackendCaseResponse[]>(`/api/v1/cases/customer/${id}`)).map(mapCase);
  },

  async getDocuments(id: number): Promise<CustomerDocument[]> {
    return (await apiGet<CustomerIdentification[]>(`/api/v1/customers/${id}/identifications`)).map(mapDocument);
  },

  async getTransactions(id: number, params: PaginationParams): Promise<CustomerTransaction[]> {
    const response = await api.get<ApiResponse<BackendTransactionResponse[]>>(`/api/v1/customers/${id}/transactions`, { params });
    return (response.data.data ?? []).map(mapTransaction);
  },

  async getCommunications(id: number): Promise<CustomerCommunication[]> {
    return (await apiGet<BackendNotificationResponse[]>(`/api/v1/notifications/customer/${id}`)).map(mapCommunication);
  },

  async getAuditTrail(id: number, params?: PaginationParams): Promise<CustomerAuditEntry[]> {
    const response = await api.get<ApiResponse<BackendAuditResponse[]>>(`/api/v1/audit/entity/CUSTOMER/${id}`, { params });
    return (response.data.data ?? []).map(mapAuditEntry);
  },

  async submitOnboarding(data: OnboardingFormData): Promise<Customer> {
    return mapCustomerDetail(await apiPost<BackendCustomerDetail>('/api/v1/customers', buildOnboardingPayload(data)));
  },

  async saveDraft(): Promise<never> {
    throw new Error('Customer draft save is not supported by the live backend.');
  },

  async verifyBvn(
    bvn: string,
    customerId?: number,
    details?: Pick<OnboardingFormData, 'firstName' | 'lastName' | 'dateOfBirth'>,
  ): Promise<BvnVerifyResult> {
    return await apiPost<BvnVerifyResult>('/api/v1/customers/verify-bvn', {
      bvn,
      customerId,
      firstName: details?.firstName,
      lastName: details?.lastName,
      dateOfBirth: details?.dateOfBirth,
    });
  },

  async kycList(params: { status?: string; page?: number; size?: number }): Promise<PaginatedResult<CustomerListItem>> {
    const response = await api.get<ApiResponse<BackendCustomerSummary[]>>('/api/v1/customers/kyc', {
      params: {
        kycStatus: params.status || undefined,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    });

    return {
      items: (response.data.data ?? []).map(mapCustomerSummary),
      page: response.data.page ?? { page: 0, size: params.size ?? 20, totalElements: 0, totalPages: 0 },
    };
  },

  async kycStats(): Promise<KycStats> {
    return mapKycStats(await apiGet<Record<string, number>>('/api/v1/customers/kyc/stats'));
  },

  async kycVerifyDocument(_customerId: number, _documentId: number, _decision: 'VERIFIED' | 'REJECTED', _reason?: string): Promise<never> {
    throw new Error('Document-level KYC approval is not exposed by the current backend.');
  },

  async kycDecide(_customerId: number, _decision: 'approve' | 'reject' | 'request_docs', _notes?: string): Promise<never> {
    throw new Error('KYC decision actions are not exposed by the current backend.');
  },

  async getSegments(): Promise<CustomerSegment[]> {
    return (await apiGet<BackendSegmentResponse[]>('/api/v1/customers/segments')).map(mapSegment);
  },
};
