import { apiGet, apiPost } from '@/lib/api';

export type FeeCategory = 'ACCOUNT_MAINTENANCE' | 'TRANSACTION' | 'CARD' | 'LOAN' | 'TRADE' | 'OTHER';
export type FeeCalcType = 'FLAT' | 'PERCENTAGE' | 'TIERED' | 'SLAB';
export type FeeSchedule = 'PER_TRANSACTION' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type WaiverAuthority = 'OFFICER' | 'MANAGER' | 'ADMIN';

export interface FeeTier {
  fromAmount: number;
  toAmount: number;
  rate: number;
  flatFee: number;
}

export interface FeeDefinition {
  id: string;
  code: string;
  name: string;
  category: FeeCategory;
  calcType: FeeCalcType;
  flatAmount?: number;
  percentage?: number;
  minFee?: number;
  maxFee?: number;
  onAmount?: 'DEBIT' | 'CREDIT' | 'BALANCE';
  tiers?: FeeTier[];
  vatApplicable: boolean;
  vatRate?: number;
  schedule: FeeSchedule;
  waiverAuthority: WaiverAuthority;
  glIncomeAccount: string;
  glReceivableAccount: string;
  applicableProducts: string[];
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  createdAt: string;
}

export interface FeeCharge {
  id: string;
  feeId: string;
  feeName: string;
  accountId: string;
  accountNumber: string;
  customerName: string;
  amount: number;
  vatAmount: number;
  date: string;
  status: 'CHARGED' | 'WAIVED' | 'PENDING' | 'REVERSED';
  waivedBy?: string;
  waivedReason?: string;
  transactionRef?: string;
}

export interface FeeWaiver {
  id: string;
  chargeId: string;
  feeId: string;
  accountId: string;
  amount: number;
  reason: string;
  requestedBy: string;
  authorizedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface BulkFeeJob {
  id: string;
  feeId: string;
  feeName: string;
  affectedAccounts: number;
  totalAmount: number;
  processedCount: number;
  failedCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  scheduledDate: string;
  createdAt: string;
}

export interface PreviewChargeResult {
  customerId: string;
  customerName: string;
  eventType: string;
  transactionAmount: number;
  applicableFees: {
    feeId: string;
    feeName: string;
    calculatedAmount: number;
    vatAmount: number;
    breakdown: string;
  }[];
  totalFees: number;
  totalVat: number;
  totalCharge: number;
}

export interface BulkFeePreview {
  feeId: string;
  feeName: string;
  affectedAccounts: number;
  totalAmount: number;
  sampleAccounts: { accountNumber: string; customerName: string; amount: number }[];
}

// ─── API Functions ───────────────────────────────────────────────────────────

export function getFeeDefinitions(): Promise<FeeDefinition[]> {
  return apiGet<FeeDefinition[]>('/api/v1/fees').catch(() => []);
}

export function getFeeById(id: string): Promise<FeeDefinition> {
  return apiGet<FeeDefinition>(`/api/v1/fees/${id}`);
}

export function createFeeDefinition(data: Omit<FeeDefinition, 'id' | 'createdAt'>): Promise<FeeDefinition> {
  return apiPost<FeeDefinition>('/api/v1/fees', data);
}

export function updateFeeDefinition(id: string, data: Partial<FeeDefinition>): Promise<FeeDefinition> {
  return apiPost<FeeDefinition>(`/api/v1/fees/${id}`, data);
}

export function getFeeChargeHistory(feeId?: string): Promise<FeeCharge[]> {
  return apiGet<FeeCharge[]>('/api/v1/fees/charges', feeId ? { feeId } : undefined).catch(() => []);
}

export function createFeeWaiver(data: {
  chargeId: string;
  feeId: string;
  accountId: string;
  amount: number;
  reason: string;
  requestedBy: string;
}): Promise<FeeWaiver> {
  return apiPost<FeeWaiver>('/api/v1/fees/waivers', data);
}

export function getPendingWaivers(): Promise<FeeWaiver[]> {
  return apiGet<FeeWaiver[]>('/api/v1/fees/waivers', { status: 'PENDING' }).catch(() => []);
}

export function approveWaiver(waiverId: string, authorizedBy: string): Promise<FeeWaiver> {
  return apiPost<FeeWaiver>(`/api/v1/fees/waivers/${waiverId}/approve`, { authorizedBy });
}

export function rejectWaiver(waiverId: string, authorizedBy: string): Promise<FeeWaiver> {
  return apiPost<FeeWaiver>(`/api/v1/fees/waivers/${waiverId}/reject`, { authorizedBy });
}

export function previewCharge(
  customerId: string,
  eventType: string,
  amount: number,
): Promise<PreviewChargeResult> {
  return apiPost<PreviewChargeResult>('/api/v1/fees/preview', { customerId, eventType, amount });
}

export function createBulkFeeJob(feeId: string, scheduledDate: string): Promise<BulkFeeJob> {
  return apiPost<BulkFeeJob>('/api/v1/fees/bulk-jobs', { feeId, scheduledDate });
}

export function getBulkFeeJobs(): Promise<BulkFeeJob[]> {
  return apiGet<BulkFeeJob[]>('/api/v1/fees/bulk-jobs').catch(() => []);
}

export function previewBulkFeeJob(feeId: string): Promise<BulkFeePreview> {
  return apiGet<BulkFeePreview>(`/api/v1/fees/bulk-jobs/preview`, { feeId });
}
