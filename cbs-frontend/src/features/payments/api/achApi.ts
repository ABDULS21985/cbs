import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';

export interface AchBatch {
  id: string;
  batchNumber: string;
  type: 'CREDIT' | 'DEBIT';
  itemCount: number;
  totalAmount: number;
  currency: string;
  submittedAt: string;
  effectiveDate: string;
  settlementDate: string;
  status: 'CREATED' | 'VALIDATED' | 'SUBMITTED' | 'ACCEPTED' | 'SETTLED' | 'RETURNED' | 'FAILED';
  originatorName: string;
  companyId: string;
  items?: AchItem[];
}

export interface AchItem {
  id: string;
  sequenceNumber: number;
  name: string;
  accountNumber: string;
  routingNumber: string;
  amount: number;
  transactionCode: string;
  addenda?: string;
  status: string;
  returnCode?: string;
}

export interface AchReturn {
  id: string;
  originalRef: string;
  returnCode: string;
  returnReason: string;
  amount: number;
  returnDate: string;
  status: string;
}

export interface SettlementSummary {
  date: string;
  counterparty: string;
  debitCount: number;
  creditCount: number;
  netPosition: number;
  status: 'SETTLED' | 'PENDING' | 'FAILED';
}

export const ACH_RETURN_CODES: Record<string, string> = {
  R01: 'Insufficient Funds',
  R02: 'Account Closed',
  R03: 'No Account / Unable to Locate Account',
  R04: 'Invalid Account Number Structure',
  R05: 'Unauthorized Debit to Consumer Account',
  R06: 'Returned Per ODFI Request',
  R07: 'Authorization Revoked by Customer',
  R08: 'Payment Stopped',
  R09: 'Uncollected Funds',
  R10: 'Customer Advises Not Authorized',
  R20: 'Non-Transaction Account',
  R21: 'Invalid Company Identification',
  R22: 'Invalid Individual ID Number',
  R23: 'Credit Entry Refused by Receiver',
  R24: 'Duplicate Entry',
  R25: 'Addenda Error',
  R26: 'Mandatory Field Error',
  R27: 'Trace Number Error',
  R28: 'Routing Number Check Digit Error',
  R29: 'Corporate Customer Advises Not Authorized',
};

export const achApi = {
  getOutboundBatches: (params?: Record<string, unknown>): Promise<AchBatch[]> =>
    apiGet<AchBatch[]>('/api/v1/ach/outbound', params),

  getOutboundBatch: (id: string): Promise<AchBatch> =>
    apiGet<AchBatch>(`/api/v1/ach/outbound/${id}`),

  submitBatch: async (data: FormData): Promise<AchBatch> => {
    const { data: responseData } = await api.post<{ data: AchBatch }>('/api/v1/ach/outbound', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return responseData.data;
  },

  getInboundBatches: (params?: Record<string, unknown>): Promise<AchBatch[]> =>
    apiGet<AchBatch[]>('/api/v1/ach/inbound', params),

  getInboundBatch: (id: string): Promise<AchBatch> =>
    apiGet<AchBatch>(`/api/v1/ach/inbound/${id}`),

  postInboundItem: (batchId: string, itemId: string): Promise<AchItem> =>
    apiPost<AchItem>(`/api/v1/ach/inbound/${batchId}/items/${itemId}/post`),

  returnInboundItem: (batchId: string, itemId: string, reasonCode: string): Promise<AchItem> =>
    apiPost<AchItem>(`/api/v1/ach/inbound/${batchId}/items/${itemId}/return`, { reasonCode }),

  getReturns: (params?: Record<string, unknown>): Promise<AchReturn[]> =>
    apiGet<AchReturn[]>('/api/v1/ach/returns', params),

  getSettlementSummary: (date?: string): Promise<SettlementSummary[]> =>
    apiGet<SettlementSummary[]>('/api/v1/ach/settlement', date ? { date } : undefined),

  getRawNachaFile: async (batchId: string): Promise<string> => {
    const response = await api.get(`/api/v1/ach/outbound/${batchId}/nacha`, { responseType: 'text' });
    return response.data as string;
  },
};
