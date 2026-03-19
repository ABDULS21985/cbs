import { apiGet, apiPost } from '@/lib/api';

// ─── Enums & Status Types ─────────────────────────────────────────────────────

export type LcPaymentTerms = 'SIGHT' | 'USANCE';
export type LcStatus = 'ISSUED' | 'SETTLED' | 'EXPIRED' | 'CANCELLED';
export type GuaranteeType =
  | 'PERFORMANCE'
  | 'ADVANCE_PAYMENT'
  | 'BID_BOND'
  | 'STANDBY_LC';
export type GuaranteeStatus = 'ISSUED' | 'CLAIMED' | 'EXPIRED' | 'RELEASED';
export type CollectionType = 'DP' | 'DA';
export type CollectionStatus = 'PENDING' | 'SETTLED' | 'RETURNED';
export type DocumentType =
  | 'BILL_OF_LADING'
  | 'INVOICE'
  | 'INSURANCE'
  | 'CERTIFICATE';
export type DocumentComplianceStatus = 'COMPLIANT' | 'DISCREPANT' | 'PENDING';
export type FactoringRecourse = 'WITH' | 'WITHOUT';
export type InvoiceStatus = 'SUBMITTED' | 'FUNDED' | 'COLLECTED' | 'OVERDUE';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LetterOfCredit {
  id: number;
  lcRef: string;
  applicant: string;
  beneficiary: string;
  currency: string;
  amount: number;
  paymentTerms: LcPaymentTerms;
  tenor?: number;
  expiryDate: string;
  issuedAt?: string;
  presentationDate?: string;
  presentedDocuments?: string[];
  discrepancies?: string;
  status: LcStatus;
  customerId?: number;
  createdAt: string;
}

export interface BankGuarantee {
  id: number;
  guaranteeRef: string;
  applicant: string;
  beneficiary: string;
  guaranteeType: GuaranteeType;
  currency: string;
  amount: number;
  expiryDate: string;
  claimAmount?: number;
  claimRef?: string;
  claimDate?: string;
  status: GuaranteeStatus;
  customerId?: number;
  createdAt: string;
}

export interface DocumentaryCollection {
  id: number;
  collectionRef: string;
  drawer: string;
  drawee: string;
  currency: string;
  amount: number;
  type: CollectionType;
  documents: string[];
  settlementDate?: string;
  settledAmount?: number;
  status: CollectionStatus;
  createdAt: string;
}

export interface ScfProgramme {
  id: number;
  programmeRef: string;
  buyer: string;
  currency: string;
  discountRate: number;
  limitAmount: number;
  utilizedAmount?: number;
  utilizationPct?: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  createdAt: string;
}

export interface TradeDocument {
  id: number;
  documentRef: string;
  documentType: DocumentType;
  lcId?: number;
  fileName?: string;
  fileUrl?: string;
  complianceStatus: DocumentComplianceStatus;
  discrepancies?: string[];
  verifiedAt?: string;
  verifiedBy?: string;
  uploadedAt: string;
}

export interface FactoringFacility {
  id: number;
  facilityCode: string;
  seller: string;
  limitAmount: number;
  currency: string;
  recourse: FactoringRecourse;
  discountRate: number;
  utilizedAmount?: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  createdAt: string;
}

export interface FactoredInvoice {
  id: number;
  facilityCode: string;
  buyerName: string;
  invoiceRef: string;
  amount: number;
  invoiceDate: string;
  dueDate: string;
  fundedAt?: string;
  collectedAmount?: number;
  collectionDate?: string;
  status: InvoiceStatus;
  createdAt: string;
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const tradeFinanceExtApi = {
  // ── Letters of Credit ────────────────────────────────────────────────────────
  getCustomerLcs: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<LetterOfCredit[]>(`/v1/trade/lc/customer/${customerId}`, params as Record<string, unknown>),

  issueLc: (input: {
    applicant: string;
    beneficiary: string;
    currency: string;
    amount: number;
    expiryDate: string;
    paymentTerms: LcPaymentTerms;
    tenor?: number;
  }) => apiPost<LetterOfCredit>('/v1/trade/lc', input),

  getLc: (id: number) =>
    apiGet<LetterOfCredit>(`/v1/trade/lc/${id}`),

  settleLc: (id: number, input: {
    presentationDate: string;
    presentedDocuments: string[];
    discrepancies?: string;
  }) => apiPost<LetterOfCredit>(`/v1/trade/lc/${id}/settle`, input),

  // ── Bank Guarantees ──────────────────────────────────────────────────────────
  getCustomerGuarantees: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<BankGuarantee[]>(`/v1/trade/guarantees/customer/${customerId}`, params as Record<string, unknown>),

  issueGuarantee: (input: {
    applicant: string;
    beneficiary: string;
    guaranteeType: GuaranteeType;
    currency: string;
    amount: number;
    expiryDate: string;
  }) => apiPost<BankGuarantee>('/v1/trade/guarantees', input),

  getGuarantee: (id: number) =>
    apiGet<BankGuarantee>(`/v1/trade/guarantees/${id}`),

  claimGuarantee: (id: number, input: {
    claimAmount: number;
    claimRef: string;
    claimDate: string;
  }) => apiPost<BankGuarantee>(`/v1/trade/guarantees/${id}/claim`, input),

  // ── Documentary Collections ──────────────────────────────────────────────────
  createCollection: (input: {
    drawer: string;
    drawee: string;
    currency: string;
    amount: number;
    type: CollectionType;
    documents: string[];
  }) => apiPost<DocumentaryCollection>('/v1/trade/collections', input),

  settleCollection: (id: number, input: {
    settlementDate: string;
    amount: number;
  }) => apiPost<DocumentaryCollection>(`/v1/trade/collections/${id}/settle`, input),

  // ── Supply Chain Finance ─────────────────────────────────────────────────────
  createScfProgramme: (input: {
    buyer: string;
    currency: string;
    discountRate: number;
    limitAmount: number;
  }) => apiPost<ScfProgramme>('/v1/trade/scf/programmes', input),

  financeInvoice: (input: {
    programmeId: number;
    supplier: string;
    invoiceRef: string;
    amount: number;
    invoiceDate: string;
    maturityDate: string;
  }) => apiPost<FactoredInvoice>('/v1/trade/scf/invoices', input),

  // ── Trade Documents ──────────────────────────────────────────────────────────
  uploadDocument: (input: {
    documentType: DocumentType;
    lcId?: number;
  }) => apiPost<TradeDocument>('/v1/trade/documents', input),

  verifyDocument: (id: number, input: {
    status: DocumentComplianceStatus;
    discrepancies?: string[];
  }) => apiPost<TradeDocument>(`/v1/trade/documents/${id}/verify`, input),

  getLcDocuments: (lcId: number) =>
    apiGet<TradeDocument[]>(`/v1/trade/documents/lc/${lcId}`),

  // ── Factoring ────────────────────────────────────────────────────────────────
  getFacilityConcentration: (code: string) =>
    apiGet<{ facilityCode: string; concentrations: Array<{ buyer: string; amount: number; pct: number }> }>(
      `/v1/factoring/facility/${code}/concentration`
    ),

  createFactoringFacility: (input: {
    seller: string;
    limitAmount: number;
    currency: string;
    recourse: FactoringRecourse;
    discountRate: number;
  }) => apiPost<FactoringFacility>('/v1/factoring/facility', input),

  submitInvoice: (input: {
    facilityCode: string;
    buyerName: string;
    invoiceRef: string;
    amount: number;
    invoiceDate: string;
    dueDate: string;
  }) => apiPost<FactoredInvoice>('/v1/factoring/invoice', input),

  fundInvoice: (id: number) =>
    apiPost<FactoredInvoice>(`/v1/factoring/invoice/${id}/fund`),

  recordCollection: (id: number, input: {
    amount: number;
    collectionDate: string;
  }) => apiPost<FactoredInvoice>(`/v1/factoring/invoice/${id}/collect`, input),
};
