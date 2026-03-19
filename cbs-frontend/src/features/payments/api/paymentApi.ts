import { apiGet, apiPost } from '@/lib/api';
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

export interface NameEnquiryResult {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
  verified: boolean;
}

export interface FeePreview {
  transferFee: number;
  vat: number;
  totalFee: number;
  totalDebit: number;
}

export interface TransferRequest {
  fromAccountId: number;
  transferType: 'OWN_ACCOUNT' | 'INTERNAL' | 'NIP' | 'SWIFT';
  beneficiaryAccountNumber: string;
  beneficiaryName: string;
  beneficiaryBankCode?: string;
  amount: number;
  currency: string;
  narration: string;
  saveBeneficiary?: boolean;
  scheduleDate?: string;
}

export interface TransferResponse extends Auditable {
  id: number;
  transactionRef: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED' | 'PENDING_APPROVAL' | 'SCHEDULED';
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
  scheduleDate?: string;
  completedAt?: string;
  failureReason?: string;
  requiresApproval: boolean;
}

export interface RecentTransfer {
  id: number;
  transactionRef: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  bankName: string;
  amount: number;
  currency: string;
  date: string;
}

export const paymentApi = {
  getAccounts: () =>
    apiGet<Account[]>('/api/v1/accounts/my'),
  getBeneficiaries: (customerId?: number) =>
    apiGet<Beneficiary[]>('/api/v1/beneficiaries', customerId ? { customerId } : undefined),
  verifyName: (accountNumber: string, bankCode: string) =>
    apiPost<NameEnquiryResult>('/api/v1/payments/name-enquiry', { accountNumber, bankCode }),
  previewFee: (amount: number, transferType: string, currency?: string) =>
    apiGet<FeePreview>('/api/v1/payments/fee-preview', { amount, transferType, currency }),
  initiateTransfer: (data: TransferRequest) =>
    apiPost<TransferResponse>('/api/v1/payments/transfer', data),
  getTransfer: (id: number) =>
    apiGet<TransferResponse>(`/api/v1/payments/transfer/${id}`),
  getRecentTransfers: () =>
    apiGet<RecentTransfer[]>('/api/v1/payments/recent'),
  checkDuplicate: (beneficiaryAccount: string, amount: number) =>
    apiGet<{ isDuplicate: boolean; existingRef?: string }>('/api/v1/payments/check-duplicate', { beneficiaryAccount, amount }),
  getBanks: () =>
    apiGet<{ code: string; name: string }[]>('/api/v1/banks'),
};
