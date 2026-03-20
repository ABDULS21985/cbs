import { apiGet, apiPost } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatementFormat = 'PDF' | 'CSV' | 'EXCEL';
export type StatementType = 'FULL' | 'MINI' | 'INTEREST_CERTIFICATE';
export type DeliveryMethod = 'EMAIL' | 'PORTAL';
export type SubscriptionFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

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

export interface StatementData {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
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

export { numberToWords };

// ─── API Functions ─────────────────────────────────────────────────────────────

export const statementApi = {
  generateStatement: (params: GenerateStatementParams): Promise<StatementData> =>
    apiPost<StatementData>('/api/v1/statements/generate', params),

  getStatementData: (accountId: string, from: string, to: string): Promise<StatementData> =>
    apiPost<StatementData>('/api/v1/statements/generate', { accountId, from, to, type: 'FULL' }),

  downloadStatement: (accountId: string, from: string, to: string, format: StatementFormat): Promise<string> =>
    apiGet<string>('/api/v1/statements/download', { accountId, from, to, format }),

  emailStatement: (accountId: string, from: string, to: string, email: string): Promise<{ success: boolean }> =>
    apiPost<{ success: boolean }>('/api/v1/statements/email', { accountId, from, to, email }),

  getCertificateData: (accountId: string, balanceDate: string, addressedTo?: string): Promise<CertificateData> =>
    apiGet<CertificateData>('/api/v1/statements/certificate', { accountId, balanceDate, addressedTo }),

  getConfirmationData: (accountId: string, purpose: string, addressedTo?: string): Promise<AccountConfirmationData> =>
    apiGet<AccountConfirmationData>('/api/v1/statements/confirmation', { accountId, purpose, addressedTo }),

  getSubscriptions: (accountId: string): Promise<StatementSubscription[]> =>
    apiGet<StatementSubscription[]>('/api/v1/statements/subscriptions', { accountId }),

  createSubscription: (data: CreateSubscriptionData): Promise<StatementSubscription> =>
    apiPost<StatementSubscription>('/api/v1/statements/subscriptions', data),

  updateSubscription: (id: string, data: Partial<CreateSubscriptionData>): Promise<StatementSubscription> =>
    apiPost<StatementSubscription>(`/api/v1/statements/subscriptions/${id}`, data),

  deleteSubscription: (id: string): Promise<void> =>
    apiPost<void>(`/api/v1/statements/subscriptions/${id}/delete`),
};
