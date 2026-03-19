import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

export interface StatusChangeRequest {
  newStatus: string;
  reason: string;
  effectiveDate: string;
  authorizerId?: string;
}

export interface AddSignatoryRequest {
  customerId: string;
  role: string;
  signingRule?: string;
}

export interface InterestRateOverrideRequest {
  overrideRate: number;
  reason: string;
  effectiveDate: string;
  expiryDate: string;
}

export interface LimitChangeRequest {
  limitType: string;
  newValue: number;
  reason: string;
}

export interface OfficerChangeRequest {
  officerId: string;
  officerName: string;
  reason: string;
  effectiveDate: string;
}

export interface MaintenanceHistoryItem {
  id: string;
  date: string;
  action: string;
  performedBy: string;
  details: string;
  status: string;
}

export interface Signatory {
  id: string;
  customerId: string;
  name: string;
  role: string;
  addedAt: string;
}

export interface AccountBasicInfo {
  id: string;
  accountNumber: string;
  accountTitle: string;
  status: string;
  productName: string;
  currency: string;
  currentOfficer: string;
  currentOfficerId: string;
  interestRate: number;
  signatories: Signatory[];
  signingRule: string;
  limits: {
    dailyTransaction: number;
    perTransaction: number;
    withdrawal: number;
    posAtm: number;
    onlineTransaction: number;
  };
}

export const accountMaintenanceApi = {
  getAccountBasicInfo: async (accountId: string): Promise<AccountBasicInfo> => {
    return apiGet<AccountBasicInfo>(`/api/v1/accounts/${accountId}`);
  },

  getMaintenanceHistory: async (accountId: string): Promise<MaintenanceHistoryItem[]> => {
    return apiGet<MaintenanceHistoryItem[]>(`/api/v1/accounts/${accountId}/maintenance-history`);
  },

  changeStatus: async (accountId: string, data: StatusChangeRequest): Promise<void> => {
    // Backend expects @RequestParam newStatus + reason, not JSON body
    return apiPatch<void>(`/api/v1/accounts/${accountId}/status?newStatus=${encodeURIComponent(data.newStatus)}&reason=${encodeURIComponent(data.reason)}`, undefined);
  },

  addSignatory: async (accountId: string, data: AddSignatoryRequest): Promise<void> => {
    return apiPost<void>(`/api/v1/accounts/${accountId}/signatories`, data);
  },

  removeSignatory: async (accountId: string, signatoryId: string, reason: string): Promise<void> => {
    return apiDelete<void>(`/api/v1/accounts/${accountId}/signatories/${signatoryId}?reason=${encodeURIComponent(reason)}`);
  },

  updateSigningRule: async (accountId: string, rule: string): Promise<void> => {
    return apiPatch<void>(`/api/v1/accounts/${accountId}/signing-rule`, { rule });
  },

  overrideInterestRate: async (accountId: string, data: InterestRateOverrideRequest): Promise<void> => {
    return apiPost<void>(`/api/v1/accounts/${accountId}/interest-rate-override`, data);
  },

  changeTransactionLimit: async (accountId: string, data: LimitChangeRequest): Promise<void> => {
    return apiPatch<void>(`/api/v1/accounts/${accountId}/limits`, data);
  },

  changeAccountOfficer: async (accountId: string, data: OfficerChangeRequest): Promise<void> => {
    return apiPatch<void>(`/api/v1/accounts/${accountId}/officer`, data);
  },
};
