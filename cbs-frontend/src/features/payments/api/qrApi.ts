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

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.DEV;

const mockQrTransactions: QrTransaction[] = [
  { id: 'qt-001', qrRef: 'QR-20240315-001', date: '2024-03-15T10:30:00Z', payerName: 'Aminu Bello', amount: 15000, currency: 'NGN', status: 'COMPLETED', settlement: '2024-03-15T10:31:00Z' },
  { id: 'qt-002', qrRef: 'QR-20240315-002', date: '2024-03-15T11:00:00Z', payerName: 'Ngozi Okafor', amount: 5500, currency: 'NGN', status: 'COMPLETED', settlement: '2024-03-15T11:01:00Z' },
  { id: 'qt-003', qrRef: 'QR-20240314-003', date: '2024-03-14T14:20:00Z', payerName: 'Chukwuemeka Eze', amount: 32000, currency: 'NGN', status: 'PENDING', settlement: '' },
  { id: 'qt-004', qrRef: 'QR-20240314-004', date: '2024-03-14T09:15:00Z', payerName: 'Fatima Abdullahi', amount: 8750, currency: 'NGN', status: 'FAILED', settlement: '' },
  { id: 'qt-005', qrRef: 'QR-20240313-005', date: '2024-03-13T16:45:00Z', payerName: 'Taiwo Adeyemi', amount: 22500, currency: 'NGN', status: 'COMPLETED', settlement: '2024-03-13T16:46:00Z' },
];

const mockLinkedAccounts: LinkedMobileAccount[] = [
  { id: 'lma-001', provider: 'MTN_MOMO', mobileNumber: '08012345678', linkedAccount: '0123456789', status: 'ACTIVE', lastTransaction: '2024-03-15T10:00:00Z' },
  { id: 'lma-002', provider: 'AIRTEL_MONEY', mobileNumber: '07098765432', linkedAccount: '0987654321', status: 'ACTIVE', lastTransaction: '2024-03-14T14:00:00Z' },
  { id: 'lma-003', provider: 'OPAY', mobileNumber: '07011112222', linkedAccount: '0123456789', status: 'PENDING', lastTransaction: undefined },
];

const mockMobileTransactions: MobileTransaction[] = [
  { id: 'mt-001', date: '2024-03-15T10:00:00Z', direction: 'IN', provider: 'MTN_MOMO', mobileNumber: '08012345678', amount: 10000, fee: 50, status: 'COMPLETED' },
  { id: 'mt-002', date: '2024-03-15T09:00:00Z', direction: 'OUT', provider: 'AIRTEL_MONEY', mobileNumber: '07098765432', amount: 5000, fee: 25, status: 'COMPLETED' },
  { id: 'mt-003', date: '2024-03-14T15:30:00Z', direction: 'IN', provider: 'MTN_MOMO', mobileNumber: '08012345678', amount: 25000, fee: 100, status: 'COMPLETED' },
  { id: 'mt-004', date: '2024-03-14T11:00:00Z', direction: 'OUT', provider: 'OPAY', mobileNumber: '07011112222', amount: 3500, fee: 17.5, status: 'FAILED' },
  { id: 'mt-005', date: '2024-03-13T16:00:00Z', direction: 'IN', provider: 'AIRTEL_MONEY', mobileNumber: '07098765432', amount: 50000, fee: 200, status: 'COMPLETED' },
  { id: 'mt-006', date: '2024-03-13T08:45:00Z', direction: 'OUT', provider: 'MTN_MOMO', mobileNumber: '08012345678', amount: 7500, fee: 37.5, status: 'COMPLETED' },
];

function delay(ms = 600) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const qrApi = {
  generateQr: async (data: {
    accountId: string;
    accountNumber: string;
    accountName: string;
    amount?: number;
    currency?: string;
  }): Promise<{ qrId: string; qrData: string; expiresAt: string; qrImageUrl?: string }> => {
    if (DEMO_MODE) {
      await delay();
      const qrId = `QR-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const qrData = JSON.stringify({
        bank: 'BellBank',
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        amount: data.amount,
        currency: data.currency || 'NGN',
        ref: qrId,
      });
      return { qrId, qrData, expiresAt };
    }
    return apiPost<{ qrId: string; qrData: string; expiresAt: string; qrImageUrl?: string }>('/api/v1/payments/qr/generate', data);
  },

  getQrTransactions: async (params?: Record<string, unknown>): Promise<QrTransaction[]> => {
    if (DEMO_MODE) {
      await delay();
      return mockQrTransactions;
    }
    return apiGet<QrTransaction[]>('/api/v1/payments/qr/transactions', params);
  },

  getLinkedMobileAccounts: async (params?: Record<string, unknown>): Promise<LinkedMobileAccount[]> => {
    if (DEMO_MODE) {
      await delay();
      return mockLinkedAccounts;
    }
    return apiGet<LinkedMobileAccount[]>('/api/v1/payments/mobile-money/linked', params);
  },

  linkMobileAccount: async (data: LinkMobileRequest): Promise<{ id: string; message: string }> => {
    if (DEMO_MODE) {
      await delay();
      return { id: `lma-${Date.now()}`, message: 'OTP sent to mobile number' };
    }
    return apiPost<{ id: string; message: string }>('/api/v1/payments/mobile-money/link', data);
  },

  unlinkMobileAccount: async (id: string): Promise<void> => {
    if (DEMO_MODE) {
      await delay();
      return;
    }
    return apiDelete<void>(`/api/v1/payments/mobile-money/${id}`);
  },

  verifyOtp: async (id: string, otp: string): Promise<{ verified: boolean; message: string }> => {
    if (DEMO_MODE) {
      await delay();
      if (otp === '000000') return { verified: false, message: 'Invalid OTP' };
      return { verified: true, message: 'Account linked successfully' };
    }
    return apiPost<{ verified: boolean; message: string }>('/api/v1/payments/mobile-money/verify-otp', { id, otp });
  },

  getMobileTransactions: async (params?: Record<string, unknown>): Promise<MobileTransaction[]> => {
    if (DEMO_MODE) {
      await delay();
      return mockMobileTransactions;
    }
    return apiGet<MobileTransaction[]>('/api/v1/payments/mobile-money/transactions', params);
  },
};
