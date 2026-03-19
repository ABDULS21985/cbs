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

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_ACCOUNT_INFO: AccountBasicInfo = {
  id: 'acc-001',
  accountNumber: '0123456789',
  accountTitle: 'Amara Okonkwo',
  status: 'ACTIVE',
  productName: 'DigiSave Premium',
  currency: 'NGN',
  currentOfficer: 'Chukwuemeka Nwosu',
  currentOfficerId: 'off-001',
  interestRate: 7.25,
  signatories: [
    { id: 'sig-001', customerId: 'cust-001', name: 'Amara Okonkwo', role: 'PRIMARY', addedAt: '2024-01-15T09:00:00Z' },
    { id: 'sig-002', customerId: 'cust-005', name: 'Fatima Al-Hassan', role: 'SECONDARY', addedAt: '2024-02-20T11:30:00Z' },
  ],
  signingRule: 'ANY_ONE',
  limits: {
    dailyTransaction: 5_000_000,
    perTransaction: 2_000_000,
    withdrawal: 500_000,
    posAtm: 300_000,
    onlineTransaction: 1_000_000,
  },
};

const MOCK_HISTORY: MaintenanceHistoryItem[] = [
  {
    id: 'hist-001',
    date: '2025-03-10T14:32:00Z',
    action: 'Interest Rate Override',
    performedBy: 'Ngozi Eze (Manager)',
    details: 'Override rate set to 8.50% effective 2025-03-10, expires 2025-09-10. Reason: Customer retention initiative.',
    status: 'COMPLETED',
  },
  {
    id: 'hist-002',
    date: '2025-02-14T09:15:00Z',
    action: 'Signatory Added',
    performedBy: 'Chukwuemeka Nwosu (Officer)',
    details: 'Fatima Al-Hassan added as SECONDARY signatory.',
    status: 'COMPLETED',
  },
  {
    id: 'hist-003',
    date: '2025-01-20T16:45:00Z',
    action: 'Transaction Limit Updated',
    performedBy: 'Chukwuemeka Nwosu (Officer)',
    details: 'Daily transaction limit increased from ₦2,000,000 to ₦5,000,000. Reason: Business expansion.',
    status: 'COMPLETED',
  },
  {
    id: 'hist-004',
    date: '2024-11-05T11:00:00Z',
    action: 'Status Changed',
    performedBy: 'Adaeze Obi (Supervisor)',
    details: 'Account status changed from DORMANT to ACTIVE. Reason: Customer reactivation request verified.',
    status: 'COMPLETED',
  },
  {
    id: 'hist-005',
    date: '2024-09-22T08:30:00Z',
    action: 'Account Officer Changed',
    performedBy: 'Emeka Ikenna (Branch Manager)',
    details: 'Account officer reassigned to Chukwuemeka Nwosu effective 2024-10-01. Previous officer: Kemi Adeyemi.',
    status: 'COMPLETED',
  },
  {
    id: 'hist-006',
    date: '2024-07-11T13:20:00Z',
    action: 'Signing Rule Modified',
    performedBy: 'Chukwuemeka Nwosu (Officer)',
    details: 'Signing rule updated from ANY_TWO to ANY_ONE.',
    status: 'COMPLETED',
  },
];

export const accountMaintenanceApi = {
  getAccountBasicInfo: async (accountId: string): Promise<AccountBasicInfo> => {
    if (IS_DEMO) {
      await delay(600);
      return { ...MOCK_ACCOUNT_INFO, id: accountId };
    }
    return apiGet<AccountBasicInfo>(`/v1/accounts/${accountId}`);
  },

  getMaintenanceHistory: async (accountId: string): Promise<MaintenanceHistoryItem[]> => {
    if (IS_DEMO) {
      await delay(700);
      return MOCK_HISTORY;
    }
    return apiGet<MaintenanceHistoryItem[]>(`/v1/accounts/${accountId}/maintenance-history`);
  },

  changeStatus: async (accountId: string, data: StatusChangeRequest): Promise<void> => {
    if (IS_DEMO) {
      await delay(1000);
      return;
    }
    return apiPost<void>(`/v1/accounts/${accountId}/status`, data);
  },

  addSignatory: async (accountId: string, data: AddSignatoryRequest): Promise<void> => {
    if (IS_DEMO) {
      await delay(900);
      return;
    }
    return apiPost<void>(`/v1/accounts/${accountId}/signatories`, data);
  },

  removeSignatory: async (accountId: string, signatoryId: string, reason: string): Promise<void> => {
    if (IS_DEMO) {
      await delay(800);
      return;
    }
    return apiDelete<void>(`/v1/accounts/${accountId}/signatories/${signatoryId}?reason=${encodeURIComponent(reason)}`);
  },

  updateSigningRule: async (accountId: string, rule: string): Promise<void> => {
    if (IS_DEMO) {
      await delay(700);
      return;
    }
    return apiPatch<void>(`/v1/accounts/${accountId}/signing-rule`, { rule });
  },

  overrideInterestRate: async (accountId: string, data: InterestRateOverrideRequest): Promise<void> => {
    if (IS_DEMO) {
      await delay(1100);
      return;
    }
    return apiPost<void>(`/v1/accounts/${accountId}/interest-rate-override`, data);
  },

  changeTransactionLimit: async (accountId: string, data: LimitChangeRequest): Promise<void> => {
    if (IS_DEMO) {
      await delay(900);
      return;
    }
    return apiPatch<void>(`/v1/accounts/${accountId}/limits`, data);
  },

  changeAccountOfficer: async (accountId: string, data: OfficerChangeRequest): Promise<void> => {
    if (IS_DEMO) {
      await delay(1000);
      return;
    }
    return apiPatch<void>(`/v1/accounts/${accountId}/officer`, data);
  },
};
