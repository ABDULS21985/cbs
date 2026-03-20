import { apiGet, apiPost, apiPut, apiDelete, apiDownload, apiUpload } from '@/lib/api';
import type { EnhancedDashboard } from '../types/dashboard';

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

// ─── Profile Types ──────────────────────────────────────────────────────────

export interface CustomerProfile {
  id: number;
  cifNumber: string;
  customerType: string;
  status: string;
  displayName: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  email: string;
  phonePrimary: string;
  phoneSecondary?: string;
  preferredLanguage?: string;
  preferredChannel?: string;
  branchCode?: string;
  profilePhotoUrl?: string;
  addresses?: Array<{
    type: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  }>;
  identifications?: Array<{
    type: string;
    number: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateRequest {
  id?: number;
  requestType: string;
  oldValue?: string;
  newValue: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  channel?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface LoginHistoryEntry {
  id: number;
  timestamp: string;
  ipAddress: string;
  device: string;
  location: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface ActiveSession {
  sessionId: string;
  device: string;
  ipAddress: string;
  location: string;
  loginTime: string;
  lastActive: string;
  current: boolean;
}

export interface TwoFactorResponse {
  enabled: boolean;
  qrCodeUrl?: string;
  secret?: string;
  message: string;
}

export interface ActivityLogEntry {
  id: number;
  eventType: string;
  action: string;
  description: string;
  performedAt: string;
  ipAddress?: string;
  channel?: string;
}

export interface PortalPreferences {
  language: string;
  defaultTransferAccountId?: number;
  statementDelivery: string;
}

export interface KycDocument {
  id: number;
  type: string;
  number: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  fileUrl?: string;
  status: string;
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

  // ─── Profile ────────────────────────────────────────────────────────────
  getProfile: (customerId: number) =>
    apiGet<CustomerProfile>(`/api/v1/portal/profile/${customerId}`),

  // ─── Profile Updates (Maker-Checker) ────────────────────────────────────
  submitProfileUpdate: (customerId: number, data: ProfileUpdateRequest) =>
    apiPost<ProfileUpdateRequest>(`/api/v1/portal/${customerId}/profile-updates`, data),
  getProfileUpdates: (customerId: number) =>
    apiGet<ProfileUpdateRequest[]>(`/api/v1/portal/${customerId}/profile-updates`),

  // ─── Security ───────────────────────────────────────────────────────────
  changePassword: (customerId: number, data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    apiPost<void>(`/api/v1/portal/security/change-password?customerId=${customerId}`, data),
  enable2fa: (customerId: number) =>
    apiPost<TwoFactorResponse>(`/api/v1/portal/security/2fa/enable?customerId=${customerId}`),
  disable2fa: (customerId: number) =>
    apiPost<TwoFactorResponse>(`/api/v1/portal/security/2fa/disable?customerId=${customerId}`),
  getLoginHistory: (customerId: number, limit = 10) =>
    apiGet<LoginHistoryEntry[]>(`/api/v1/portal/security/login-history`, { customerId, limit }),
  getActiveSessions: (customerId: number) =>
    apiGet<ActiveSession[]>(`/api/v1/portal/security/active-sessions`, { customerId }),
  terminateSession: (customerId: number, sessionId: string) =>
    apiDelete<void>(`/api/v1/portal/security/sessions/${sessionId}?customerId=${customerId}`),

  // ─── Activity Log ───────────────────────────────────────────────────────
  getActivityLog: (customerId: number, params?: Record<string, unknown>) =>
    apiGet<ActivityLogEntry[]>('/api/v1/portal/activity-log', { customerId, ...params }),

  // ─── Preferences ────────────────────────────────────────────────────────
  getPreferences: (customerId: number) =>
    apiGet<PortalPreferences>('/api/v1/portal/preferences', { customerId }),
  updatePreferences: (customerId: number, data: PortalPreferences) =>
    apiPut<PortalPreferences>(`/api/v1/portal/preferences?customerId=${customerId}`, data),

  // ─── Documents ──────────────────────────────────────────────────────────
  uploadDocument: (customerId: number, file: File) =>
    apiUpload<KycDocument>(`/api/v1/portal/${customerId}/documents`, file),

  // ─── Enhanced Dashboard ────────────────────────────────────────────────
  getEnhancedDashboard: (customerId: number) =>
    apiGet<EnhancedDashboard>(`/api/v1/portal/dashboard/enhanced/${customerId}`),

  // ─── Notifications ────────────────────────────────────────────────────
  getNotifications: (page = 0, size = 20) =>
    apiGet<Record<string, unknown>[]>('/api/v1/portal/notifications', { page, size } as Record<string, unknown>),
  markNotificationsRead: (ids: number[]) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/notifications/mark-read', { ids }),

  // ─── Bills & Airtime ──────────────────────────────────────────────────
  getBillers: () =>
    apiGet<Record<string, unknown>[]>('/api/v1/portal/billers'),
  validateBiller: (billerId: number, customerRef: string) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/billers/validate', { billerId, customerRef }),
  payBill: (data: { billerId: number; billerName: string; customerRef: string; amount: number; accountId: number }) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/billers/pay', data),
  purchaseAirtime: (data: { network: string; phone: string; amount: number; type: string; accountId: number }) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/airtime/purchase', data),

  // ─── Card Extras ──────────────────────────────────────────────────────
  freezeCard: (cardId: number, freeze: boolean) =>
    apiPost<PortalCard>(`/api/v1/portal/cards/${cardId}/freeze?freeze=${freeze}`),
  setTravelNotice: (cardId: number, data: { country: string; fromDate: string; toDate: string }) =>
    apiPost<Record<string, unknown>>(`/api/v1/portal/cards/${cardId}/travel-notice`, data),

  // ─── Help ─────────────────────────────────────────────────────────────
  getFaq: () =>
    apiGet<{ q: string; a: string }[]>('/api/v1/portal/help/faq'),
  submitContactForm: (data: { name: string; email: string; subject: string; message: string }) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/help/contact', data),

  // ─── Transfers ────────────────────────────────────────────────────────
  executeTransfer: (data: { debitAccountId: number; creditAccountId: number; amount: number; narration: string; idempotencyKey: string }) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/transfers/internal', data),
  validateTransfer: (accountNumber: string, bankCode?: string) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/transfers/validate', { accountNumber, bankCode: bankCode || '000' }),
  sendOtp: (accountId: number) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/transfers/otp/send', { accountId }),
  verifyOtp: (sessionId: string, otpCode: string) =>
    apiPost<Record<string, unknown>>('/api/v1/portal/transfers/otp/verify', { sessionId, otpCode }),
  getTransferLimits: () =>
    apiGet<Record<string, unknown>>('/api/v1/portal/transfers/limits'),
};
