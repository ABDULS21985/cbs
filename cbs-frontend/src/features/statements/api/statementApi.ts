import { apiGet, apiPostParams, apiPost } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatementFormat = 'PDF' | 'CSV' | 'EXCEL';
export type StatementType = 'FULL' | 'MINI' | 'INTEREST_CERTIFICATE';
export type DeliveryMethod = 'EMAIL' | 'PORTAL';
export type SubscriptionFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

/** A single transaction row as returned by the backend /v1/statements/generate endpoint */
export interface StatementTransactionBackend {
  transactionRef: string;
  date: string;
  narration: string;
  type: string;
  amount: number;
  runningBalance: number;
}

/** Normalised transaction row for frontend rendering */
export interface StatementTransaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
  channel?: string;
}

/** Backend response shape from POST /v1/statements/generate */
export interface StatementBackendResponse {
  statementId: string;
  accountId: number;
  accountNumber: string;
  accountName: string;
  currencyCode: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
  transactions: StatementTransactionBackend[];
  generatedAt: string;
}

/** Normalised statement data used by all frontend components */
export interface StatementData {
  statementId: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  transactions: StatementTransaction[];
  bankName: string;
  bankAddress: string;
  bankLicense: string;
  bankEmail: string;
  bankPhone: string;
}

export interface CertificateBackendResponse {
  accountId: number;
  accountNumber: string;
  accountName: string;
  currencyCode: string;
  currentBalance: number;
  availableBalance: number;
  accountStatus: string;
  asOfDate: string;
  certificateRef: string;
  generatedAt: string;
}

export interface CertificateData {
  referenceNumber: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  balance: number;
  balanceDate: string;
  addressedTo: string;
  generatedAt: string;
  authorizedBy: string;
  authorizedTitle: string;
  bankName: string;
  bankAddress: string;
}

export interface ConfirmationBackendResponse {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currencyCode: string;
  accountStatus: string;
  openedDate: string;
  branchCode: string;
  confirmationRef: string;
  generatedAt: string;
}

export interface AccountConfirmationData {
  referenceNumber: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  openingDate: string;
  currency: string;
  status: string;
  addressedTo: string;
  purpose: string;
  generatedAt: string;
  bankName: string;
  bankAddress: string;
}

export interface StatementSubscription {
  id: string;
  accountId: string;
  accountNumber: string;
  frequency: SubscriptionFrequency;
  delivery: DeliveryMethod;
  format: StatementFormat;
  email?: string;
  active: boolean;
  nextDelivery: string;
  createdAt: string;
}

export interface DownloadBackendResponse {
  accountNumber: string;
  accountName: string;
  currencyCode: string;
  fromDate: string;
  toDate: string;
  transactionCount: number;
  format: string;
  generatedAt: string;
  downloadReady: boolean;
}

export interface EmailBackendResponse {
  accountId: number;
  accountNumber: string;
  emailAddress: string;
  fromDate: string;
  toDate: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface GenerateStatementParams {
  accountId: string;
  from: string;
  to: string;
  type: StatementType;
}

export interface CreateSubscriptionData {
  accountId: string;
  frequency: SubscriptionFrequency;
  delivery: DeliveryMethod;
  format: StatementFormat;
  email?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BANK_NAME = 'BellBank Nigeria PLC';
const BANK_ADDRESS = '12 Marina Street, Lagos Island, Lagos, Nigeria';
const BANK_LICENSE = 'CBN/RC-003456';
const BANK_EMAIL = 'support@bellbank.ng';
const BANK_PHONE = '0700-BELL-BANK';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDebitType(type: string): boolean {
  return type.includes('DEBIT') || type.includes('FEE') || type.includes('TRANSFER_OUT') || type.includes('LIEN');
}

/** Map backend transaction list to normalised frontend rows */
function mapTransactions(txns: StatementTransactionBackend[]): StatementTransaction[] {
  return txns.map((t, i) => ({
    id: `txn-${i}-${t.transactionRef}`,
    date: t.date,
    reference: t.transactionRef,
    description: t.narration,
    debit: isDebitType(t.type) ? t.amount : undefined,
    credit: isDebitType(t.type) ? undefined : t.amount,
    balance: t.runningBalance,
  }));
}

/** Map backend statement response to frontend StatementData */
function mapStatementResponse(r: StatementBackendResponse): StatementData {
  return {
    statementId: r.statementId,
    accountNumber: r.accountNumber,
    accountName: r.accountName,
    accountType: 'Current', // not returned by backend
    currency: r.currencyCode,
    openingBalance: r.openingBalance,
    closingBalance: r.closingBalance,
    totalDebits: r.totalDebits,
    totalCredits: r.totalCredits,
    periodFrom: r.fromDate,
    periodTo: r.toDate,
    generatedAt: r.generatedAt,
    transactions: mapTransactions(r.transactions ?? []),
    bankName: BANK_NAME,
    bankAddress: BANK_ADDRESS,
    bankLicense: BANK_LICENSE,
    bankEmail: BANK_EMAIL,
    bankPhone: BANK_PHONE,
  };
}

function mapCertificateResponse(r: CertificateBackendResponse, addressedTo?: string): CertificateData {
  return {
    referenceNumber: r.certificateRef,
    accountNumber: r.accountNumber,
    accountName: r.accountName,
    accountType: r.accountStatus,
    currency: r.currencyCode,
    balance: r.currentBalance,
    balanceDate: r.asOfDate,
    addressedTo: addressedTo ?? 'To Whom It May Concern',
    generatedAt: r.generatedAt,
    authorizedBy: 'Head, Operations',
    authorizedTitle: 'Chief Operations Officer',
    bankName: BANK_NAME,
    bankAddress: BANK_ADDRESS,
  };
}

function mapConfirmationResponse(
  r: ConfirmationBackendResponse,
  purpose: string,
  addressedTo?: string,
): AccountConfirmationData {
  return {
    referenceNumber: r.confirmationRef,
    accountNumber: r.accountNumber,
    accountName: r.accountName,
    accountType: r.accountType,
    openingDate: r.openedDate,
    currency: r.currencyCode,
    status: r.accountStatus,
    addressedTo: addressedTo ?? 'To Whom It May Concern',
    purpose,
    generatedAt: r.generatedAt,
    bankName: BANK_NAME,
    bankAddress: BANK_ADDRESS,
  };
}

export function numberToWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 1_000_000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 1_000_000_000) return convert(Math.floor(n / 1_000_000)) + 'Million ' + convert(n % 1_000_000);
    return convert(Math.floor(n / 1_000_000_000)) + 'Billion ' + convert(n % 1_000_000_000);
  }

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = convert(intPart).trim() + ' Naira';
  if (decPart > 0) result += ` and ${convert(decPart).trim()} Kobo`;
  return result + ' Only';
}

// ─── API Functions ────────────────────────────────────────────────────────────
// All /v1/statements endpoints use @RequestParam, not @RequestBody.
// We use apiPostParams / apiGet accordingly to match the Spring controller.

export const statementApi = {
  /**
   * Generate statement. Backend expects @RequestParam: accountId (Long), fromDate, toDate.
   * Uses POST with query params to match backend POST /v1/statements/generate.
   */
  generateStatement: async (params: GenerateStatementParams): Promise<StatementData> => {
    const raw = await apiPostParams<StatementBackendResponse>('/v1/statements/generate', {
      accountId: params.accountId,
      fromDate: params.from,
      toDate: params.to,
    });
    return mapStatementResponse(raw);
  },

  /** Alias for generating full statement */
  getStatementData: async (accountId: string, from: string, to: string): Promise<StatementData> => {
    const raw = await apiPostParams<StatementBackendResponse>('/v1/statements/generate', {
      accountId,
      fromDate: from,
      toDate: to,
    });
    return mapStatementResponse(raw);
  },

  /**
   * Download statement data. Backend returns structured JSON (not a file blob).
   * GET /v1/statements/download with @RequestParam accountId, fromDate, toDate, format.
   */
  downloadStatement: async (
    accountId: string,
    from: string,
    to: string,
    format: StatementFormat,
  ): Promise<DownloadBackendResponse> =>
    apiGet<DownloadBackendResponse>('/v1/statements/download', {
      accountId,
      fromDate: from,
      toDate: to,
      format,
    }),

  /**
   * Email statement to customer.
   * POST /v1/statements/email with @RequestParam: accountId, fromDate, toDate, emailAddress.
   */
  emailStatement: async (
    accountId: string,
    from: string,
    to: string,
    email: string,
  ): Promise<EmailBackendResponse> =>
    apiPostParams<EmailBackendResponse>('/v1/statements/email', {
      accountId,
      fromDate: from,
      toDate: to,
      emailAddress: email,
    }),

  /**
   * Certificate of balance.
   * GET /v1/statements/certificate with @RequestParam accountId (Long).
   */
  getCertificateData: async (
    accountId: string,
    _balanceDate: string,
    addressedTo?: string,
  ): Promise<CertificateData> => {
    const raw = await apiGet<CertificateBackendResponse>('/v1/statements/certificate', { accountId });
    return mapCertificateResponse(raw, addressedTo);
  },

  /**
   * Account confirmation letter.
   * GET /v1/statements/confirmation with @RequestParam accountId (Long).
   */
  getConfirmationData: async (
    accountId: string,
    purpose: string,
    addressedTo?: string,
  ): Promise<AccountConfirmationData> => {
    const raw = await apiGet<ConfirmationBackendResponse>('/v1/statements/confirmation', { accountId });
    return mapConfirmationResponse(raw, purpose, addressedTo);
  },

  /**
   * List subscriptions.
   * GET /v1/statements/subscriptions with @RequestParam accountId (Long).
   */
  getSubscriptions: async (accountId: string): Promise<StatementSubscription[]> =>
    apiGet<StatementSubscription[]>('/v1/statements/subscriptions', { accountId }),

  /** Create subscription. POST /v1/statements/subscriptions with @RequestBody. */
  createSubscription: (data: CreateSubscriptionData): Promise<StatementSubscription> =>
    apiPost<StatementSubscription>('/v1/statements/subscriptions', data),

  /** Update subscription. POST /v1/statements/subscriptions/{id} with @RequestBody. */
  updateSubscription: (id: string, data: Partial<CreateSubscriptionData>): Promise<StatementSubscription> =>
    apiPost<StatementSubscription>(`/v1/statements/subscriptions/${id}`, data),

  /** Delete subscription. POST /v1/statements/subscriptions/{id}/delete. */
  deleteSubscription: (id: string): Promise<void> =>
    apiPost<void>(`/v1/statements/subscriptions/${id}/delete`),
};
