import api, { apiGet, apiPost, apiPostParams } from '@/lib/api';
import type { ApiResponse } from '@/types/common';

// ─── Enums & Status Types ─────────────────────────────────────────────────────

export type LcPaymentTerms = 'SIGHT' | 'DEFERRED' | 'MIXED' | 'ACCEPTANCE' | 'NEGOTIATION' | 'USANCE';
export type LcStatus = 'DRAFT' | 'ISSUED' | 'ADVISED' | 'CONFIRMED' | 'AMENDED' | 'PARTIALLY_UTILIZED' | 'FULLY_UTILIZED' | 'EXPIRED' | 'CANCELLED' | 'CLOSED' | 'SETTLED';
export type LcType = 'IMPORT_LC' | 'EXPORT_LC' | 'STANDBY_LC' | 'TRANSFERABLE_LC' | 'REVOLVING_LC' | 'RED_CLAUSE' | 'GREEN_CLAUSE' | 'BACK_TO_BACK';
export type GuaranteeType = 'PERFORMANCE' | 'BID_BOND' | 'ADVANCE_PAYMENT' | 'CUSTOMS' | 'FINANCIAL' | 'PAYMENT' | 'RETENTION' | 'WARRANTY' | 'SHIPPING' | 'STANDBY_LC' | 'OTHER';
export type GuaranteeStatus = 'DRAFT' | 'ISSUED' | 'ACTIVE' | 'CLAIMED' | 'PARTIALLY_CLAIMED' | 'EXPIRED' | 'CANCELLED' | 'RELEASED';
export type CollectionType = 'DP' | 'DA';
export type CollectionStatus = 'RECEIVED' | 'PRESENTED' | 'ACCEPTED' | 'PAID' | 'PROTESTED' | 'RETURNED' | 'CANCELLED' | 'PENDING' | 'SETTLED';
export type DocumentType = 'INVOICE' | 'BILL_OF_LADING' | 'PACKING_LIST' | 'CERTIFICATE_OF_ORIGIN' | 'INSURANCE_CERT' | 'INSPECTION_CERT' | 'WEIGHT_CERT' | 'PHYTOSANITARY' | 'CUSTOMS_DECLARATION' | 'DRAFT' | 'OTHER' | 'INSURANCE' | 'CERTIFICATE';
export type DocumentComplianceStatus = 'COMPLIANT' | 'DISCREPANT' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type FactoringRecourse = 'WITH' | 'WITHOUT';
export type InvoiceStatus = 'SUBMITTED' | 'APPROVED' | 'FINANCED' | 'FUNDED' | 'SETTLED' | 'COLLECTED' | 'DISPUTED' | 'OVERDUE';

// ─── Interfaces (aligned with backend entities) ──────────────────────────────

export interface LetterOfCredit {
  id: number;
  lcNumber: string;
  lcType: LcType | string;
  lcRole: string;
  applicant: { id: number; name?: string; [key: string]: unknown } | string;
  beneficiaryName: string;
  beneficiaryAddress?: string;
  beneficiaryBankCode?: string;
  beneficiaryBankName?: string;
  issuingBankCode?: string;
  advisingBankCode?: string;
  confirmingBankCode?: string;
  amount: number;
  currencyCode: string;
  tolerancePositivePct?: number;
  toleranceNegativePct?: number;
  utilizedAmount: number;
  issueDate: string;
  expiryDate: string;
  latestShipmentDate?: string;
  tenorDays?: number;
  paymentTerms?: LcPaymentTerms | string;
  incoterms?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  goodsDescription?: string;
  requiredDocuments?: string[];
  specialConditions?: string[];
  isIrrevocable?: boolean;
  isConfirmed?: boolean;
  isTransferable?: boolean;
  ucpVersion?: string;
  marginPercentage?: number;
  marginAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  swiftCharges?: number;
  status: LcStatus | string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  // Aliases for backward compat
  lcRef?: string;
  beneficiary?: string;
  currency?: string;
  issuedAt?: string;
  tenor?: number;
  customerId?: number;
}

export interface BankGuarantee {
  id: number;
  guaranteeNumber: string;
  guaranteeType: GuaranteeType | string;
  applicant: { id: number; name?: string; [key: string]: unknown } | string;
  beneficiaryName: string;
  beneficiaryAddress?: string;
  amount: number;
  currencyCode: string;
  issueDate: string;
  expiryDate: string;
  claimExpiryDate?: string;
  autoExtend?: boolean;
  extensionPeriodDays?: number;
  underlyingContractRef?: string;
  purpose?: string;
  governingLaw?: string;
  isDemandGuarantee?: boolean;
  claimConditions?: string[];
  marginPercentage?: number;
  marginAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  claimedAmount: number;
  status: GuaranteeStatus | string;
  createdAt?: string;
  // Aliases
  guaranteeRef?: string;
  beneficiary?: string;
  currency?: string;
  claimAmount?: number;
  claimRef?: string;
  claimDate?: string;
  customerId?: number;
}

export interface DocumentaryCollection {
  id: number;
  collectionNumber: string;
  collectionType: string;
  collectionRole?: string;
  drawer: { id?: number; [key: string]: unknown } | string;
  draweeName: string;
  draweeAddress?: string;
  amount: number;
  currencyCode: string;
  documentsList?: string[];
  tenorDays?: number;
  maturityDate?: string;
  acceptanceDate?: string;
  protestInstructions?: string;
  paidAmount?: number;
  paidDate?: string;
  status: CollectionStatus | string;
  createdAt?: string;
  // Aliases
  collectionRef?: string;
  drawee?: string;
  currency?: string;
  type?: CollectionType | string;
  documents?: string[];
  settlementDate?: string;
  settledAmount?: number;
}

export interface ScfProgramme {
  id: number;
  programmeCode: string;
  programmeName?: string;
  programmeType?: string;
  anchorCustomer?: { id: number; [key: string]: unknown };
  programmeLimit: number;
  utilizedAmount: number;
  availableAmount?: number;
  currencyCode: string;
  discountRate?: number;
  marginOverBase?: number;
  effectiveDate?: string;
  expiryDate?: string;
  status: string;
  createdAt?: string;
  // Aliases
  programmeRef?: string;
  buyer?: string;
  currency?: string;
  limitAmount?: number;
  utilizationPct?: number;
}

export interface TradeDocument {
  id: number;
  documentRef: string;
  documentCategory: DocumentType | string;
  lcId?: number;
  collectionId?: number;
  customerId?: number;
  fileName: string;
  fileType?: string;
  storagePath?: string;
  fileSizeBytes?: number;
  extractedData?: Record<string, unknown>;
  extractionConfidence?: number;
  extractionStatus?: string;
  verificationStatus: DocumentComplianceStatus | string;
  verifiedBy?: string;
  discrepancyNotes?: string;
  createdAt?: string;
  // Aliases
  documentType?: DocumentType | string;
  complianceStatus?: DocumentComplianceStatus | string;
  discrepancies?: string[];
  verifiedAt?: string;
  uploadedAt?: string;
  fileUrl?: string;
}

export interface FactoringFacility {
  id: number;
  facilityCode: string;
  facilityType: string;
  sellerCustomerId?: number;
  sellerName?: string;
  buyerCustomerIds?: Record<string, unknown>;
  currency: string;
  facilityLimit: number;
  utilizedAmount: number;
  availableAmount?: number;
  advanceRatePct?: number;
  discountRatePct?: number;
  serviceFeeRatePct?: number;
  collectionPeriodDays?: number;
  dilutionReservePct?: number;
  maxInvoiceAge?: number;
  maxConcentrationPct?: number;
  creditInsuranceProvider?: string;
  creditInsurancePolicyRef?: string;
  notificationRequired?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: string;
  createdAt?: string;
  // Aliases
  seller?: string;
  limitAmount?: number;
  recourse?: FactoringRecourse;
  discountRate?: number;
}

export interface FactoredInvoice {
  id: number;
  facilityId?: number;
  invoiceRef: string;
  invoiceDate: string;
  invoiceAmount?: number;
  buyerName: string;
  buyerId?: number;
  advanceAmount?: number;
  discountAmount?: number;
  netProceedsToSeller?: number;
  collectionDueDate?: string;
  actualCollectionDate?: string;
  collectedAmount?: number;
  dilutionAmount?: number;
  recourseExercised?: boolean;
  recourseAmount?: number;
  serviceFeeCharged?: number;
  status: InvoiceStatus | string;
  createdAt?: string;
  // Aliases
  facilityCode?: string;
  amount?: number;
  dueDate?: string;
  fundedAt?: string;
  collectionDate?: string;
}

// ─── LC Amendments & Presentations (new) ─────────────────────────────────────

export interface LcAmendment {
  id: number;
  lcId: number;
  amendmentNumber: number;
  amendmentType: string;
  oldValue: string;
  newValue: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface LcDocumentPresentation {
  id: number;
  lcId: number;
  presentationNumber: number;
  presentedDate: string;
  documentsPresented: string[];
  amountClaimed: number;
  examinationStatus: 'PENDING' | 'COMPLIANT' | 'DISCREPANT' | 'REFUSED';
  discrepancies: string[];
  discrepancyWaived?: boolean;
  settlementAmount?: number;
  settlementDate?: string;
  settlementRef?: string;
  createdAt: string;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const tradeFinanceExtApi = {
  // ── Letters of Credit ────────────────────────────────────────────────────────
  listLcs: (params?: Record<string, unknown>) =>
    apiGet<LetterOfCredit[]>('/api/v1/trade-finance/lc', params),

  getCustomerLcs: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<LetterOfCredit[]>(`/api/v1/trade-finance/lc/customer/${customerId}`, params as Record<string, unknown>),

  issueLc: (input: {
    applicantId: number;
    lcType?: string;
    beneficiaryName: string;
    amount: number;
    currencyCode: string;
    expiryDate: string;
    goodsDescription: string;
    requiredDocuments?: string[];
    paymentTerms?: string;
    tenorDays?: number;
    marginAccountId?: number;
    marginPercentage?: number;
    commissionRate?: number;
  }) => apiPostParams<LetterOfCredit>('/api/v1/trade-finance/lc', {
    applicantId: input.applicantId,
    lcType: input.lcType ?? 'IMPORT_LC',
    beneficiaryName: input.beneficiaryName,
    amount: input.amount,
    currencyCode: input.currencyCode,
    expiryDate: input.expiryDate,
    goodsDescription: input.goodsDescription,
    requiredDocuments: input.requiredDocuments,
    paymentTerms: input.paymentTerms,
    tenorDays: input.tenorDays,
    marginAccountId: input.marginAccountId,
    marginPercentage: input.marginPercentage,
    commissionRate: input.commissionRate,
  }),

  getLc: (id: number) =>
    apiGet<LetterOfCredit>(`/api/v1/trade-finance/lc/${id}`),

  settleLc: (id: number, amount: number) =>
    apiPost<LetterOfCredit>(`/api/v1/trade-finance/lc/${id}/settle?amount=${amount}`),

  // ── LC Amendments ──────────────────────────────────────────────────────────
  getLcAmendments: (lcId: number) =>
    apiGet<LcAmendment[]>(`/api/v1/trade-finance/lc/${lcId}/amendments`),

  createLcAmendment: (lcId: number, data: Partial<LcAmendment>) =>
    apiPost<LcAmendment>(`/api/v1/trade-finance/lc/${lcId}/amendments`, data),

  approveLcAmendment: (lcId: number, amendmentId: number) =>
    apiPost<LcAmendment>(`/api/v1/trade-finance/lc/${lcId}/amendments/${amendmentId}/approve`),

  rejectLcAmendment: (lcId: number, amendmentId: number) =>
    apiPost<LcAmendment>(`/api/v1/trade-finance/lc/${lcId}/amendments/${amendmentId}/reject`),

  // ── LC Presentations ───────────────────────────────────────────────────────
  getLcPresentations: (lcId: number) =>
    apiGet<LcDocumentPresentation[]>(`/api/v1/trade-finance/lc/${lcId}/presentations`),

  createLcPresentation: (lcId: number, data: { documentsPresented: string[]; amountClaimed: number }) =>
    apiPost<LcDocumentPresentation>(`/api/v1/trade-finance/lc/${lcId}/presentations`, data),

  // ── Bank Guarantees ──────────────────────────────────────────────────────────
  listGuarantees: (params?: Record<string, unknown>) =>
    apiGet<BankGuarantee[]>('/api/v1/trade-finance/guarantees', params),

  getCustomerGuarantees: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<BankGuarantee[]>(`/api/v1/trade-finance/guarantees/customer/${customerId}`, params as Record<string, unknown>),

  issueGuarantee: (input: {
    applicantId: number;
    guaranteeType: string;
    beneficiaryName: string;
    amount: number;
    currencyCode: string;
    expiryDate: string;
    purpose: string;
    autoExtend?: boolean;
    extensionPeriodDays?: number;
    marginAccountId?: number;
    marginPercentage?: number;
    commissionRate?: number;
  }) => apiPostParams<BankGuarantee>('/api/v1/trade-finance/guarantees', {
    applicantId: input.applicantId,
    guaranteeType: input.guaranteeType,
    beneficiaryName: input.beneficiaryName,
    amount: input.amount,
    currencyCode: input.currencyCode,
    expiryDate: input.expiryDate,
    purpose: input.purpose,
    autoExtend: input.autoExtend,
    extensionPeriodDays: input.extensionPeriodDays,
    marginAccountId: input.marginAccountId,
    marginPercentage: input.marginPercentage,
    commissionRate: input.commissionRate,
  }),

  getGuarantee: (id: number) =>
    apiGet<BankGuarantee>(`/api/v1/trade-finance/guarantees/${id}`),

  claimGuarantee: (id: number, amount: number) =>
    apiPost<BankGuarantee>(`/api/v1/trade-finance/guarantees/${id}/claim?amount=${amount}`),

  // ── Documentary Collections ──────────────────────────────────────────────────
  listCollections: (params?: Record<string, unknown>) =>
    apiGet<DocumentaryCollection[]>('/api/v1/trade-finance/collections', params),

  createCollection: (input: {
    drawerCustomerId: number;
    collectionType: string;
    draweeName: string;
    amount: number;
    currencyCode: string;
    documents?: string[];
    tenorDays?: number;
  }) => apiPostParams<DocumentaryCollection>('/api/v1/trade-finance/collections', {
    drawerCustomerId: input.drawerCustomerId,
    collectionType: input.collectionType,
    draweeName: input.draweeName,
    amount: input.amount,
    currencyCode: input.currencyCode,
    documents: input.documents,
    tenorDays: input.tenorDays,
  }),

  settleCollection: (id: number, amount: number) =>
    apiPost<DocumentaryCollection>(`/api/v1/trade-finance/collections/${id}/settle?amount=${amount}`),

  // ── Supply Chain Finance ─────────────────────────────────────────────────────
  listScfProgrammes: () =>
    apiGet<ScfProgramme[]>('/api/v1/trade-finance/scf/programmes'),

  createScfProgramme: (input: {
    anchorCustomerId: number;
    type: string;
    programmeName: string;
    limit: number;
    currencyCode: string;
    expiryDate: string;
    discountRate?: number;
  }) => apiPostParams<ScfProgramme>('/api/v1/trade-finance/scf/programmes', {
    anchorCustomerId: input.anchorCustomerId,
    type: input.type,
    programmeName: input.programmeName,
    limit: input.limit,
    currencyCode: input.currencyCode,
    expiryDate: input.expiryDate,
    discountRate: input.discountRate,
  }),

  listScfInvoices: (params?: Record<string, unknown>) =>
    apiGet<FactoredInvoice[]>('/api/v1/trade-finance/scf/invoices', params),

  financeInvoice: (input: {
    programmeId: number;
    invoiceNumber: string;
    sellerId?: number;
    buyerId?: number;
    invoiceAmount: number;
    currencyCode: string;
    invoiceDate: string;
    dueDate: string;
  }) => apiPostParams<FactoredInvoice>('/api/v1/trade-finance/scf/invoices', {
    programmeId: input.programmeId,
    invoiceNumber: input.invoiceNumber,
    sellerId: input.sellerId,
    buyerId: input.buyerId,
    invoiceAmount: input.invoiceAmount,
    currencyCode: input.currencyCode,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
  }),

  // ── Trade Documents ──────────────────────────────────────────────────────────
  listDocuments: () =>
    apiGet<TradeDocument[]>('/api/v1/trade-finance/documents'),

  uploadDocument: (input: {
    category: string;
    lcId?: number;
    collectionId?: number;
    customerId?: number;
    fileName: string;
    fileType: string;
    storagePath?: string;
    fileSizeBytes?: number;
  }) => apiPostParams<TradeDocument>('/api/v1/trade-finance/documents', {
    category: input.category,
    lcId: input.lcId,
    collectionId: input.collectionId,
    customerId: input.customerId,
    fileName: input.fileName,
    fileType: input.fileType,
    storagePath: input.storagePath,
    fileSizeBytes: input.fileSizeBytes,
  }),

  uploadDocumentWithFile: (input: {
    file: File;
    category: string;
    lcId?: number;
    collectionId?: number;
    customerId?: number;
  }) => {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('category', input.category);
    if (input.lcId != null) formData.append('lcId', String(input.lcId));
    if (input.collectionId != null) formData.append('collectionId', String(input.collectionId));
    if (input.customerId != null) formData.append('customerId', String(input.customerId));
    return api.post<ApiResponse<TradeDocument>>('/api/v1/trade-finance/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data.data);
  },

  verifyDocument: (id: number, input: {
    verifiedBy: string;
    compliant: boolean;
    notes?: string;
  }) => apiPostParams<TradeDocument>(`/api/v1/trade-finance/documents/${id}/verify`, {
    verifiedBy: input.verifiedBy,
    compliant: input.compliant,
    notes: input.notes,
  }),

  getLcDocuments: (lcId: number) =>
    apiGet<TradeDocument[]>(`/api/v1/trade-finance/documents/lc/${lcId}`),

  // ── Factoring ────────────────────────────────────────────────────────────────
  getFacilityConcentration: (code: string) =>
    apiGet<Record<string, number>>(`/api/v1/factoring/facility/${code}/concentration`),

  createFactoringFacility: (data: Partial<FactoringFacility>) =>
    apiPost<FactoringFacility>('/api/v1/factoring/facility', data),

  submitInvoice: (data: Partial<FactoredInvoice>) =>
    apiPost<FactoredInvoice>('/api/v1/factoring/invoice', data),

  fundInvoice: (id: number) =>
    apiPost<FactoredInvoice>(`/api/v1/factoring/invoice/${id}/fund`),

  recordCollection: (id: number, input: { amount: number; collectionDate: string }) =>
    apiPostParams<FactoredInvoice>(`/api/v1/factoring/invoice/${id}/collect`, { amount: input.amount }),
};
