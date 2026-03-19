import api, { apiGet } from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { Auditable } from '@/types/common';

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
  timestamp: string;
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

export interface PaymentInstruction extends Auditable {
  id: number;
  instructionNumber: string;
  status: string;
  debitAccountId: number;
  creditAccountNumber?: string;
  beneficiaryName?: string;
  amount: number;
  currencyCode: string;
  narration?: string;
  failureReason?: string;
}

async function postWithParams<T>(url: string, params: Record<string, unknown>): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, undefined, { params });
  return data.data;
}

export const paymentApi = {
  getAccounts: () =>
    apiGet<Account[]>('/v1/accounts/my').catch(() => [] as Account[]),

  getBeneficiaries: (customerId?: number) =>
    apiGet<Beneficiary[]>('/v1/beneficiaries', customerId ? { customerId } : undefined)
      .catch(() => [] as Beneficiary[]),

  initiateTransfer: (data: TransferRequest): Promise<PaymentInstruction> => {
    if (data.transferType === 'OWN_ACCOUNT' || data.transferType === 'INTERNAL') {
      // POST /v1/payments/transfer?debitAccountId=X&creditAccountId=Y&amount=Z&narration=...
      return postWithParams<PaymentInstruction>('/v1/payments/transfer', {
        debitAccountId: data.fromAccountId,
        creditAccountId: data.beneficiaryAccountNumber,
        amount: data.amount,
        narration: data.narration,
      });
    }

    if (data.transferType === 'NIP') {
      // POST /v1/payments/domestic?debitAccountId=X&creditAccountNumber=Y&...
      return postWithParams<PaymentInstruction>('/v1/payments/domestic', {
        debitAccountId: data.fromAccountId,
        creditAccountNumber: data.beneficiaryAccountNumber,
        beneficiaryName: data.beneficiaryName,
        beneficiaryBankCode: data.beneficiaryBankCode,
        amount: data.amount,
        currencyCode: data.currency,
        narration: data.narration,
      });
    }

    if (data.transferType === 'SWIFT') {
      // POST /v1/payments/swift?debitAccountId=X&creditAccountNumber=Y&...
      return postWithParams<PaymentInstruction>('/v1/payments/swift', {
        debitAccountId: data.fromAccountId,
        creditAccountNumber: data.beneficiaryAccountNumber,
        beneficiaryName: data.beneficiaryName,
        beneficiaryBankCode: data.beneficiaryBankCode ?? '',
        beneficiaryBankName: data.beneficiaryBankName ?? '',
        amount: data.amount,
        sourceCurrency: data.currency,
        targetCurrency: data.currency,
        narration: data.narration,
      });
    }

    return Promise.reject(new Error(`Unsupported transfer type: ${data.transferType}`));
  },

  getPayment: (id: number) =>
    apiGet<PaymentInstruction>(`/v1/payments/${id}`),

  getAccountPayments: (accountId: number) =>
    apiGet<PaymentInstruction[]>(`/v1/payments/account/${accountId}`).catch(() => [] as PaymentInstruction[]),

  getFxRate: (source: string, target: string) =>
    apiGet<FxRate>(`/v1/payments/fx-rate/${source}/${target}`),
};
