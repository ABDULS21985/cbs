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

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || true;

function generateMockBatches(type: 'OUTBOUND' | 'INBOUND'): AchBatch[] {
  const statuses: AchBatch['status'][] = ['CREATED', 'VALIDATED', 'SUBMITTED', 'ACCEPTED', 'SETTLED', 'RETURNED', 'FAILED'];
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const submitted = new Date(now);
    submitted.setDate(submitted.getDate() - i);
    const effective = new Date(submitted);
    effective.setDate(effective.getDate() + 1);
    const settlement = new Date(effective);
    settlement.setDate(settlement.getDate() + 1);
    return {
      id: `${type.toLowerCase()}-batch-${i + 1}`,
      batchNumber: `ACH-${type === 'OUTBOUND' ? 'OUT' : 'IN'}-${String(1000 + i).padStart(6, '0')}`,
      type: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
      itemCount: Math.floor(Math.random() * 50) + 5,
      totalAmount: Math.floor(Math.random() * 5000000) + 100000,
      currency: 'USD',
      submittedAt: submitted.toISOString(),
      effectiveDate: effective.toISOString().split('T')[0],
      settlementDate: settlement.toISOString().split('T')[0],
      status: statuses[i % statuses.length],
      originatorName: ['First National Bank', 'Commerce Trust', 'United Credit Union', 'Metro Savings'][i % 4],
      companyId: `COMP${String(100 + i).padStart(6, '0')}`,
    };
  });
}

function generateMockItems(batchId: string): AchItem[] {
  const codes = ['22', '27', '32', '37', '42', '52'];
  return Array.from({ length: 10 }, (_, i) => ({
    id: `item-${batchId}-${i + 1}`,
    sequenceNumber: i + 1,
    name: ['John Smith', 'Jane Doe', 'Robert Johnson', 'Emily Davis', 'Michael Wilson'][i % 5],
    accountNumber: String(Math.floor(Math.random() * 9000000000) + 1000000000),
    routingNumber: ['021000021', '026009593', '021202337', '071000013'][i % 4],
    amount: Math.floor(Math.random() * 50000) + 1000,
    transactionCode: codes[i % codes.length],
    addenda: i % 3 === 0 ? `Payment reference ${i + 1}` : undefined,
    status: i === 2 ? 'RETURNED' : 'SETTLED',
    returnCode: i === 2 ? 'R01' : undefined,
  }));
}

function generateMockReturns(): AchReturn[] {
  const codes = Object.keys(ACH_RETURN_CODES);
  return Array.from({ length: 8 }, (_, i) => {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() - i);
    const code = codes[i % codes.length];
    return {
      id: `return-${i + 1}`,
      originalRef: `ACH-OUT-${String(1000 + i).padStart(6, '0')}`,
      returnCode: code,
      returnReason: ACH_RETURN_CODES[code],
      amount: Math.floor(Math.random() * 10000) + 500,
      returnDate: returnDate.toISOString(),
      status: i % 3 === 0 ? 'PENDING' : 'PROCESSED',
    };
  });
}

function generateMockSettlement(date?: string): SettlementSummary[] {
  const targetDate = date ? new Date(date) : new Date();
  const counterparties = ['Federal Reserve Bank', 'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citibank'];
  return counterparties.map((cp, i) => ({
    date: targetDate.toISOString().split('T')[0],
    counterparty: cp,
    debitCount: Math.floor(Math.random() * 100) + 10,
    creditCount: Math.floor(Math.random() * 100) + 10,
    netPosition: (Math.random() - 0.5) * 2000000,
    status: (['SETTLED', 'PENDING', 'FAILED'] as const)[i % 3],
  }));
}

function generateNachaFile(batch: AchBatch): string {
  const pad = (s: string, n: number) => s.padEnd(n, ' ').slice(0, n);
  const padLeft = (s: string, n: number) => s.padStart(n, '0').slice(-n);
  const lines: string[] = [];
  // File Header
  lines.push(`101 021000021${pad(batch.companyId, 10)}${pad(new Date().toISOString().slice(2, 10).replace(/-/g, ''), 6)}${pad('0000', 4)}A094101${pad(batch.originatorName, 23)}${pad('DEST BANK NAME       ', 23)}${pad('', 8)}`);
  // Batch Header
  lines.push(`5${batch.type === 'CREDIT' ? '200' : '225'}${pad(batch.originatorName, 16)}${pad(batch.companyId, 9)}${pad('', 9)}CCD${pad('PAYMENT', 10)}${batch.effectiveDate.replace(/-/g, '').slice(2)}${pad('', 6)}1${pad('021000021', 8)}0000001`);
  // Entry Details
  const items = generateMockItems(batch.id);
  items.forEach((item, idx) => {
    lines.push(`6${item.transactionCode}${item.routingNumber.slice(0, 8)}${padLeft(item.routingNumber.slice(8, 9), 1)}${pad(item.accountNumber, 17)}${padLeft(String(item.amount), 10)}${pad(item.name, 22)}${pad('', 2)}0${pad(batch.companyId, 9)}${padLeft(String(idx + 1), 7)}`);
    if (item.addenda) {
      lines.push(`705${pad(item.addenda, 80)}0000${padLeft(String(idx + 1), 7)}`);
    }
  });
  // Batch Control
  const totalDebit = items.filter(() => batch.type === 'DEBIT').reduce((s, it) => s + it.amount, 0);
  const totalCredit = items.filter(() => batch.type === 'CREDIT').reduce((s, it) => s + it.amount, 0);
  lines.push(`8${batch.type === 'CREDIT' ? '200' : '225'}${padLeft(String(items.length), 6)}${padLeft(String(items.reduce((s, it) => s + parseInt(it.routingNumber.slice(0, 8)), 0)), 10)}${padLeft(String(totalDebit), 12)}${padLeft(String(totalCredit), 12)}${pad(batch.originatorName, 23)}${pad('', 39)}${pad(batch.companyId, 9)}0000001`);
  // File Control
  lines.push(`9000001000001${padLeft(String(items.length), 8)}${padLeft(String(items.reduce((s, it) => s + parseInt(it.routingNumber.slice(0, 8)), 0)), 10)}${padLeft(String(totalDebit), 12)}${padLeft(String(totalCredit), 12)}${pad('', 39)}`);
  // Padding
  while (lines.length % 10 !== 0) {
    lines.push('9'.repeat(94));
  }
  return lines.join('\n');
}

export const achApi = {
  getOutboundBatches: async (params?: Record<string, unknown>): Promise<AchBatch[]> => {
    if (DEMO_MODE) return generateMockBatches('OUTBOUND');
    return apiGet<AchBatch[]>('/v1/ach/outbound', params);
  },

  getOutboundBatch: async (id: string): Promise<AchBatch> => {
    if (DEMO_MODE) {
      const batches = generateMockBatches('OUTBOUND');
      const batch = batches.find((b) => b.id === id) || batches[0];
      return { ...batch, items: generateMockItems(id) };
    }
    return apiGet<AchBatch>(`/v1/ach/outbound/${id}`);
  },

  submitBatch: async (data: FormData): Promise<AchBatch> => {
    if (DEMO_MODE) {
      const batches = generateMockBatches('OUTBOUND');
      return { ...batches[0], id: `new-batch-${Date.now()}`, status: 'CREATED' };
    }
    const { data: responseData } = await api.post<{ data: AchBatch }>('/v1/ach/outbound', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return responseData.data;
  },

  getInboundBatches: async (params?: Record<string, unknown>): Promise<AchBatch[]> => {
    if (DEMO_MODE) return generateMockBatches('INBOUND');
    return apiGet<AchBatch[]>('/v1/ach/inbound', params);
  },

  getInboundBatch: async (id: string): Promise<AchBatch> => {
    if (DEMO_MODE) {
      const batches = generateMockBatches('INBOUND');
      const batch = batches.find((b) => b.id === id) || batches[0];
      return { ...batch, items: generateMockItems(id) };
    }
    return apiGet<AchBatch>(`/v1/ach/inbound/${id}`);
  },

  postInboundItem: async (batchId: string, itemId: string): Promise<AchItem> => {
    if (DEMO_MODE) {
      const items = generateMockItems(batchId);
      return { ...items[0], id: itemId, status: 'POSTED' };
    }
    return apiPost<AchItem>(`/v1/ach/inbound/${batchId}/items/${itemId}/post`);
  },

  returnInboundItem: async (batchId: string, itemId: string, reasonCode: string): Promise<AchItem> => {
    if (DEMO_MODE) {
      const items = generateMockItems(batchId);
      return { ...items[0], id: itemId, status: 'RETURNED', returnCode: reasonCode };
    }
    return apiPost<AchItem>(`/v1/ach/inbound/${batchId}/items/${itemId}/return`, { reasonCode });
  },

  getReturns: async (params?: Record<string, unknown>): Promise<AchReturn[]> => {
    if (DEMO_MODE) return generateMockReturns();
    return apiGet<AchReturn[]>('/v1/ach/returns', params);
  },

  getSettlementSummary: async (date?: string): Promise<SettlementSummary[]> => {
    if (DEMO_MODE) return generateMockSettlement(date);
    return apiGet<SettlementSummary[]>('/v1/ach/settlement', date ? { date } : undefined);
  },

  getRawNachaFile: async (batchId: string): Promise<string> => {
    if (DEMO_MODE) {
      const batches = generateMockBatches('OUTBOUND');
      const batch = batches.find((b) => b.id === batchId) || batches[0];
      return generateNachaFile(batch);
    }
    const response = await api.get(`/v1/ach/outbound/${batchId}/nacha`, { responseType: 'text' });
    return response.data as string;
  },
};
