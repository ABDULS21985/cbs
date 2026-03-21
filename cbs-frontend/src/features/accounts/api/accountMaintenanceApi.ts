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
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
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

// Backend AccountResponse shape for mapping
interface BackendAccountResponse {
  id: number;
  accountNumber: string;
  accountName?: string | null;
  productName?: string | null;
  productCategory?: string | null;
  currencyCode?: string | null;
  currency?: string | null;
  status?: string | null;
  relationshipManager?: string | null;
  applicableInterestRate?: number | null;
  allowDebit?: boolean | null;
  allowCredit?: boolean | null;
  signatories?: {
    id?: number | null;
    customerId?: number | null;
    customerDisplayName?: string | null;
    signatoryType?: string | null;
    signingRule?: string | null;
    isActive?: boolean | null;
    effectiveFrom?: string | null;
  }[] | null;
}

// Backend MaintenanceHistoryResponse shape
interface BackendMaintenanceHistory {
  id: number;
  action?: string | null;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  details?: string | null;
  performedBy?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

function mapAccountBasicInfo(raw: BackendAccountResponse): AccountBasicInfo {
  const signatories: Signatory[] = (raw.signatories ?? [])
    .filter((s) => s.isActive !== false)
    .map((s) => ({
      id: String(s.id ?? 0),
      customerId: String(s.customerId ?? ''),
      name: s.customerDisplayName ?? 'Unknown',
      role: s.signatoryType ?? 'AUTHORISED',
      addedAt: s.effectiveFrom ?? '',
    }));

  const signingRule = raw.signatories?.find((s) => s.signingRule)?.signingRule ?? 'ANY';

  return {
    id: String(raw.id),
    accountNumber: raw.accountNumber,
    accountTitle: raw.accountName ?? raw.accountNumber,
    status: raw.status ?? 'ACTIVE',
    productName: raw.productName ?? 'Account product',
    currency: raw.currency ?? raw.currencyCode ?? 'NGN',
    currentOfficer: raw.relationshipManager ?? 'Unassigned',
    currentOfficerId: '',
    interestRate: raw.applicableInterestRate ?? 0,
    signatories,
    signingRule,
    limits: {
      dailyTransaction: 0,
      perTransaction: 0,
      withdrawal: 0,
      posAtm: 0,
      onlineTransaction: 0,
    },
  };
}

interface BackendAccountLimit {
  id: number;
  limitType: string;
  limitValue: number;
  previousValue?: number | null;
  reason?: string | null;
  effectiveDate?: string | null;
  performedBy?: string | null;
}

function mapLimitsFromBackend(limits: BackendAccountLimit[]): AccountBasicInfo['limits'] {
  const result = {
    dailyTransaction: 0,
    perTransaction: 0,
    withdrawal: 0,
    posAtm: 0,
    onlineTransaction: 0,
  };

  for (const limit of limits) {
    const value = limit.limitValue ?? 0;
    switch (limit.limitType) {
      case 'DAILY_TRANSACTION': result.dailyTransaction = value; break;
      case 'PER_TRANSACTION': result.perTransaction = value; break;
      case 'WITHDRAWAL': result.withdrawal = value; break;
      case 'POS_ATM': result.posAtm = value; break;
      case 'ONLINE_TRANSACTION': result.onlineTransaction = value; break;
    }
  }

  return result;
}

function mapMaintenanceHistory(raw: BackendMaintenanceHistory): MaintenanceHistoryItem {
  return {
    id: String(raw.id),
    date: raw.createdAt ?? '',
    action: raw.action ?? 'Unknown action',
    fieldChanged: raw.fieldChanged ?? undefined,
    oldValue: raw.oldValue ?? undefined,
    newValue: raw.newValue ?? undefined,
    performedBy: raw.performedBy ?? 'System',
    details: raw.details ?? '',
    status: raw.status ?? 'COMPLETED',
  };
}

export const accountMaintenanceApi = {
  getAccountBasicInfo: async (accountId: string): Promise<AccountBasicInfo> => {
    const [raw, limits] = await Promise.all([
      apiGet<BackendAccountResponse>(`/api/v1/accounts/${accountId}`),
      apiGet<BackendAccountLimit[]>(`/api/v1/accounts/${accountId}/limits`).catch(() => [] as BackendAccountLimit[]),
    ]);
    const info = mapAccountBasicInfo(raw);
    info.limits = mapLimitsFromBackend(limits);
    return info;
  },

  getMaintenanceHistory: async (accountId: string): Promise<MaintenanceHistoryItem[]> => {
    const raw = await apiGet<BackendMaintenanceHistory[]>(`/api/v1/accounts/${accountId}/maintenance-history`);
    return raw.map(mapMaintenanceHistory);
  },

  changeStatus: async (accountId: string, data: StatusChangeRequest): Promise<void> => {
    // Backend expects @RequestParam newStatus + reason, not JSON body
    return apiPatch<void>(`/api/v1/accounts/${accountId}/status?newStatus=${encodeURIComponent(data.newStatus)}&reason=${encodeURIComponent(data.reason)}`, undefined);
  },

  addSignatory: async (accountId: string, data: AddSignatoryRequest): Promise<void> => {
    return apiPost<void>(`/api/v1/accounts/${accountId}/signatories`, {
      customerId: Number(data.customerId),
      role: data.role,
      signingRule: data.signingRule,
    });
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
