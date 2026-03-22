import api, { apiGet } from '@/lib/api';
import type { ApiResponse, Auditable } from '@/types/common';

export interface Account {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  availableBalance: number;
}

export interface Beneficiary {
  id: number;
  customerId: number;
  name: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  isSaved: boolean;
}

export interface FxRate {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  inverseRate: number;
  buyRate: number;
  sellRate: number;
  midRate: number;
  timestamp: string;
  validUntil: string;
  source: string;
}

export interface BackendFxRate {
  sourceCurrency: string;
  targetCurrency: string;
  buyRate?: number | string | null;
  sellRate?: number | string | null;
  midRate?: number | string | null;
  rateDate?: string | null;
  rateSource?: string | null;
  createdAt?: string | null;
}

function parseFxNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapFxRate(raw: BackendFxRate | null | undefined): FxRate {
  const buyRate = parseFxNumber(raw?.buyRate);
  const sellRate = parseFxNumber(raw?.sellRate);
  const midRate = parseFxNumber(raw?.midRate);
  const directRate = midRate || sellRate || buyRate;

  return {
    sourceCurrency: raw?.sourceCurrency ?? '',
    targetCurrency: raw?.targetCurrency ?? '',
    rate: directRate,
    inverseRate: directRate > 0 ? Number((1 / directRate).toFixed(12)) : 0,
    buyRate,
    sellRate,
    midRate,
    timestamp: raw?.createdAt ?? raw?.rateDate ?? new Date().toISOString(),
    validUntil: new Date(Date.now() + 30_000).toISOString(),
    source: raw?.rateSource ?? 'FX Board',
  };
}

export interface BankOption {
  code: string;
  name: string;
}

export interface TransferRequest {
  fromAccountId: number;
  transferType: 'OWN_ACCOUNT' | 'INTERNAL' | 'NIP' | 'SWIFT';
  beneficiaryAccountNumber: string;
  beneficiaryName: string;
  beneficiaryBankCode?: string;
  beneficiaryBankName?: string;
  amount: number;
  currency: string;
  narration: string;
  saveBeneficiary?: boolean;
}

// Frontend display type — mapped from backend PaymentInstruction
export interface TransferResponse extends Auditable {
  id: number;
  transactionRef: string;
  status: string;
  fromAccount: string;
  fromAccountName: string;
  toAccount: string;
  toAccountName: string;
  toBankName?: string;
  amount: number;
  currency: string;
  fee: number;
  vat: number;
  totalDebit: number;
  narration: string;
  requiresApproval: boolean;
  failureReason?: string;
}

// Display type for recent transfers list — data not available from backend
export interface RecentTransfer {
  id: number;
  beneficiaryName: string;
  beneficiaryAccount: string;
  bankName: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  direction: 'CREDIT' | 'DEBIT';
  reference?: string;
  narration?: string;
}

// Optional fee preview model used when a payment rail returns fee details.
export interface FeePreview {
  transferFee: number;
  vat: number;
  totalFee: number;
  totalDebit: number;
}

export interface NameEnquiryResult {
  verified: boolean;
  accountName: string;
  bankName: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRef?: string;
}

// Backend entity shape
interface BackendPaymentInstruction {
  id: number;
  instructionRef: string;
  paymentType?: string;
  debitAccountNumber: string;
  creditAccountNumber: string;
  beneficiaryName?: string | null;
  beneficiaryBankName?: string | null;
  amount: number;
  currencyCode: string;
  chargeAmount?: number | null;
  status: string;
  failureReason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function mapPaymentInstruction(p: BackendPaymentInstruction): TransferResponse {
  const fee = p.chargeAmount ?? 0;
  return {
    id: p.id,
    transactionRef: p.instructionRef,
    status: p.status,
    fromAccount: p.debitAccountNumber,
    fromAccountName: '',
    toAccount: p.creditAccountNumber,
    toAccountName: p.beneficiaryName ?? '',
    toBankName: p.beneficiaryBankName ?? undefined,
    amount: p.amount,
    currency: p.currencyCode,
    fee,
    vat: 0,
    totalDebit: p.amount + fee,
    narration: '',
    requiresApproval: false,
    failureReason: p.failureReason ?? undefined,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
    version: 0,
  };
}

async function postWithParams<T>(url: string, params: Record<string, unknown>): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, undefined, { params });
  return data.data;
}

export const paymentApi = {
  getAccounts: () =>
    apiGet<Account[]>('/api/v1/accounts', { page: 0, size: 50 }),

  getBeneficiaries: (customerId?: number) =>
    apiGet<Beneficiary[]>('/api/v1/payments/beneficiaries', customerId ? { customerId } : undefined)
      ,

  initiateTransfer: (data: TransferRequest): Promise<TransferResponse> => {
    if (data.transferType === 'OWN_ACCOUNT' || data.transferType === 'INTERNAL') {
      return postWithParams<BackendPaymentInstruction>('/api/v1/payments/transfer', {
        debitAccountId: data.fromAccountId,
        creditAccountId: data.beneficiaryAccountNumber,
        amount: data.amount,
        narration: data.narration,
      }).then(mapPaymentInstruction);
    }

    if (data.transferType === 'NIP') {
      return postWithParams<BackendPaymentInstruction>('/api/v1/payments/domestic', {
        debitAccountId: data.fromAccountId,
        creditAccountNumber: data.beneficiaryAccountNumber,
        beneficiaryName: data.beneficiaryName,
        beneficiaryBankCode: data.beneficiaryBankCode,
        amount: data.amount,
        currencyCode: data.currency,
        narration: data.narration,
      }).then(mapPaymentInstruction);
    }

    if (data.transferType === 'SWIFT') {
      return postWithParams<BackendPaymentInstruction>('/api/v1/payments/swift', {
        debitAccountId: data.fromAccountId,
        creditAccountNumber: data.beneficiaryAccountNumber,
        beneficiaryName: data.beneficiaryName,
        beneficiaryBankCode: data.beneficiaryBankCode ?? '',
        beneficiaryBankName: data.beneficiaryBankName ?? '',
        amount: data.amount,
        sourceCurrency: data.currency,
        targetCurrency: data.currency,
        remittanceInfo: data.narration,
      }).then(mapPaymentInstruction);
    }

    return Promise.reject(new Error(`Unsupported transfer type: ${data.transferType}`));
  },

  getPayment: (id: number) =>
    apiGet<BackendPaymentInstruction>(`/api/v1/payments/${id}`).then(mapPaymentInstruction),

  getAccountPayments: (accountId: number) =>
    apiGet<BackendPaymentInstruction[]>(`/api/v1/payments/account/${accountId}`)
      .then((list) => list.map(mapPaymentInstruction))
      ,

  getFxRate: (source: string, target: string) =>
    apiGet<BackendFxRate>(`/api/v1/payments/fx-rate/${source}/${target}`).then(mapFxRate),
};
