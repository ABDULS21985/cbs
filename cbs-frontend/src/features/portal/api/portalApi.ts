import { apiGet, apiPost, apiPut, apiDelete, apiDownload } from '@/lib/api';

export interface PortalAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  balance: number;
  availableBalance: number;
  currency: string;
  status: string;
}

export interface PortalTransaction {
  id: number;
  date: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  reference?: string;
}

export interface PortalBeneficiary {
  id: number;
  name: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

export interface PortalCard {
  id: number;
  type: 'DEBIT' | 'CREDIT' | 'PREPAID';
  maskedPan: string;
  expiry: string;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED';
  onlineEnabled: boolean;
  internationalEnabled: boolean;
  dailyPosLimit: number;
  dailyAtmLimit: number;
  dailyOnlineLimit: number;
}

export interface PortalServiceRequest {
  id: number;
  type: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  submittedAt: string;
  completedAt?: string;
}

export const portalApi = {
  getAccounts: () =>
    apiGet<PortalAccount[]>('/api/v1/portal/accounts'),
  getTransactions: (accountId: number, params?: Record<string, unknown>) =>
    apiGet<PortalTransaction[]>(`/api/v1/portal/accounts/${accountId}/transactions`, params),
  getRecentTransactions: () =>
    apiGet<PortalTransaction[]>('/api/v1/portal/transactions/recent'),
  downloadStatement: (accountId: number, from: string, to: string, format: 'PDF' | 'CSV') =>
    apiDownload(`/api/v1/portal/accounts/${accountId}/statement?from=${from}&to=${to}&format=${format}`, `statement.${format.toLowerCase()}`),

  getBeneficiaries: () =>
    apiGet<PortalBeneficiary[]>('/api/v1/portal/beneficiaries'),
  addBeneficiary: (data: Omit<PortalBeneficiary, 'id'>) =>
    apiPost<PortalBeneficiary>('/api/v1/portal/beneficiaries', data),
  removeBeneficiary: (id: number) =>
    apiDelete<void>(`/api/v1/portal/beneficiaries/${id}`),

  getCards: () =>
    apiGet<PortalCard[]>('/api/v1/portal/cards'),
  toggleCardFeature: (cardId: number, feature: string, enabled: boolean) =>
    apiPost<PortalCard>(`/api/v1/portal/cards/${cardId}/controls`, { feature, enabled }),
  blockCard: (cardId: number, reason: string) =>
    apiPost<void>(`/api/v1/portal/cards/${cardId}/block`, { reason }),

  getServiceRequests: () =>
    apiGet<PortalServiceRequest[]>('/api/v1/portal/service-requests'),
  createServiceRequest: (data: { type: string; description: string }) =>
    apiPost<PortalServiceRequest>('/api/v1/portal/service-requests', data),
  getRequestTypes: () =>
    apiGet<string[]>('/api/v1/portal/service-requests/types'),
};
