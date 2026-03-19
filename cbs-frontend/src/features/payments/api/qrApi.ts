import { apiGet, apiPost, apiDelete } from '@/lib/api';

export interface QrCode {
  qrId: string;
  qrData: string;
  expiresAt: string;
  accountName: string;
  accountNumber: string;
  amount?: number;
  currency: string;
}

export interface QrTransaction {
  id: string;
  qrRef: string;
  date: string;
  payerName: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  settlement: string;
}

export interface LinkMobileRequest {
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY' | '9PSB' | 'OPAY' | 'PALMPAY';
  mobileNumber: string;
  accountId: string;
  accountNumber: string;
}

export interface LinkedMobileAccount {
  id: string;
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY' | '9PSB' | 'OPAY' | 'PALMPAY';
  mobileNumber: string;
  linkedAccount: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  lastTransaction?: string;
}

export interface MobileTransaction {
  id: string;
  date: string;
  direction: 'IN' | 'OUT';
  provider: string;
  mobileNumber: string;
  amount: number;
  fee: number;
  status: string;
}

export const qrApi = {
  generateQr: (data: {
    accountId: string;
    accountNumber: string;
    accountName: string;
    amount?: number;
    currency?: string;
  }) =>
    apiPost<{ qrId: string; qrData: string; expiresAt: string; qrImageUrl?: string }>('/api/v1/payments/qr/generate', data),

  getQrTransactions: (params?: Record<string, unknown>) =>
    apiGet<QrTransaction[]>('/api/v1/payments/qr/transactions', params),

  getLinkedMobileAccounts: (params?: Record<string, unknown>) =>
    apiGet<LinkedMobileAccount[]>('/api/v1/payments/mobile-money/linked', params),

  linkMobileAccount: (data: LinkMobileRequest) =>
    apiPost<{ id: string; message: string }>('/api/v1/payments/mobile-money/link', data),

  unlinkMobileAccount: (id: string) =>
    apiDelete<void>(`/api/v1/payments/mobile-money/${id}`),

  verifyOtp: (id: string, otp: string) =>
    apiPost<{ verified: boolean; message: string }>('/api/v1/payments/mobile-money/verify-otp', { id, otp }),

  getMobileTransactions: (params?: Record<string, unknown>) =>
    apiGet<MobileTransaction[]>('/api/v1/payments/mobile-money/transactions', params),
};
