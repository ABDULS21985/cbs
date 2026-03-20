import { apiGet, apiPost, apiPut } from '@/lib/api';
import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

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

export interface FeePreviewResult {
  feeCode: string;
  calculatedAmount: number;
  vatAmount: number;
  totalAmount: number;
  breakdown: string;
}

// ── Backend fee result shape from FeeEngine ───────────────────────────────────

interface BackendFeeResult {
  feeCode?: string;
  feeName?: string;
  baseAmount?: number;
  feeAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
  breakdown?: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

// GET /v1/fees/definitions
export function getFeeDefinitions(): Promise<FeeDefinition[]> {
  return apiGet<FeeDefinition[]>('/api/v1/fees/definitions');
}

// GET /v1/fees/definitions (find by id from list — no dedicated endpoint)
export function getFeeById(id: string): Promise<FeeDefinition> {
  return getFeeDefinitions().then((list) => {
    const found = list.find((f) => f.id === id || f.code === id);
    if (!found) throw new Error(`Fee definition '${id}' not found`);
    return found;
  });
}

// POST /v1/fees/definitions
export function createFeeDefinition(data: Omit<FeeDefinition, 'id' | 'createdAt'>): Promise<FeeDefinition> {
  return apiPost<FeeDefinition>('/api/v1/fees/definitions', data);
}

// PUT /v1/fees/definitions/{id}
export function updateFeeDefinition(id: string, data: Partial<FeeDefinition>): Promise<FeeDefinition> {
  return apiPut<FeeDefinition>(`/api/v1/fees/definitions/${id}`, data);
}

// GET /v1/fees/preview/{feeCode}?amount=X
export function previewFee(feeCode: string, amount: number): Promise<FeePreviewResult> {
  return apiGet<FeePreviewResult>(`/api/v1/fees/preview/${encodeURIComponent(feeCode)}`, { amount });
}

// Preview event fees — maps POST /v1/fees/charge/event to PreviewChargeResult shape
export async function previewCharge(
  _customerId: string,
  eventType: string,
  amount: number,
): Promise<PreviewChargeResult> {
  const results = await (async () => {
    const { data } = await api.post<ApiResponse<BackendFeeResult[]>>(
      '/api/v1/fees/charge/event',
      undefined,
      { params: { triggerEvent: eventType, accountId: 0, amount } },
    );
    return data.data ?? [];
  })().catch(() => [] as BackendFeeResult[]);

  const applicableFees = results.map((r) => ({
    feeId: r.feeCode ?? '',
    feeName: r.feeName ?? r.feeCode ?? '',
    calculatedAmount: r.feeAmount ?? r.totalAmount ?? 0,
    vatAmount: r.vatAmount ?? 0,
    breakdown: r.breakdown ?? '',
  }));

  return {
    customerId: _customerId,
    customerName: '',
    eventType,
    transactionAmount: amount,
    applicableFees,
    totalFees: applicableFees.reduce((s, f) => s + f.calculatedAmount, 0),
    totalVat: applicableFees.reduce((s, f) => s + f.vatAmount, 0),
    totalCharge: applicableFees.reduce((s, f) => s + f.calculatedAmount + f.vatAmount, 0),
  };
}

// POST /v1/fees/charge?feeCode=X&accountId=Y&amount=Z
export async function chargeFee(
  feeCode: string,
  accountId: string,
  amount: number,
  triggerRef?: string,
): Promise<FeePreviewResult> {
  const params: Record<string, unknown> = { feeCode, accountId, amount };
  if (triggerRef) params.triggerRef = triggerRef;
  const { data } = await api.post<ApiResponse<FeePreviewResult>>('/api/v1/fees/charge', undefined, { params });
  return data.data;
}

// POST /v1/fees/waive/{chargeLogId}?waivedBy=X&reason=Y
export async function waiveFee(chargeLogId: string, waivedBy: string, reason: string): Promise<FeeCharge> {
  const { data } = await api.post<ApiResponse<FeeCharge>>(
    `/api/v1/fees/waive/${encodeURIComponent(chargeLogId)}`,
    undefined,
    { params: { waivedBy, reason } },
  );
  return data.data;
}

// GET /v1/fees/history/account/{accountId}
export function getAccountFeeHistory(accountId: string): Promise<FeeCharge[]> {
  return apiGet<FeeCharge[]>(`/api/v1/fees/history/account/${accountId}`);
}

// Backward-compat alias — maps feeId to getAccountFeeHistory if numeric, else returns empty
export function getFeeChargeHistory(feeId?: string): Promise<FeeCharge[]> {
  if (!feeId) return Promise.resolve([]);
  return getAccountFeeHistory(feeId);
}

// GET /v1/fees/waivers/pending
export function getPendingWaivers(): Promise<FeeWaiver[]> {
  return apiGet<FeeWaiver[]>('/api/v1/fees/waivers/pending');
}

// Backend waive = approve; route through waiveFee
export function approveWaiver(waiverId: string, authorizedBy: string): Promise<FeeWaiver> {
  return waiveFee(waiverId, authorizedBy, 'Approved by ' + authorizedBy).then((charge) => ({
    id: waiverId,
    chargeId: charge.id,
    feeId: charge.feeId,
    accountId: charge.accountId,
    amount: charge.amount,
    reason: 'Approved',
    requestedBy: authorizedBy,
    authorizedBy,
    status: 'APPROVED' as const,
    createdAt: new Date().toISOString(),
  }));
}

// POST /v1/fees/waivers/{waiverId}/reject
export function rejectWaiver(waiverId: string, reason: string): Promise<FeeWaiver> {
  return apiPost<FeeWaiver>(`/api/v1/fees/waivers/${waiverId}/reject`, { reason });
}

// POST /v1/fees/bulk-post
export function createBulkFeeJob(feeId: string, scheduledDate: string): Promise<BulkFeeJob> {
  return apiPost<BulkFeeJob>('/api/v1/fees/bulk-post', { feeId, scheduledDate });
}

// GET /v1/fees/bulk-jobs
export function getBulkFeeJobs(): Promise<BulkFeeJob[]> {
  return apiGet<BulkFeeJob[]>('/api/v1/fees/bulk-jobs');
}

// GET /v1/fees/bulk-post/preview?feeId=X
export function previewBulkFeeJob(feeId: string): Promise<BulkFeePreview> {
  return apiGet<BulkFeePreview>(`/api/v1/fees/bulk-post/preview?feeId=${feeId}`);
}

// POST /v1/fees/charges/{chargeLogId}/reverse
export function reverseFeeCharge(chargeLogId: string): Promise<FeeCharge> {
  return apiPost<FeeCharge>(`/api/v1/fees/charges/${chargeLogId}/reverse`);
}

// GET /v1/fees/waivers — all waivers (not just pending)
export function getAllWaivers(): Promise<FeeWaiver[]> {
  return apiGet<FeeWaiver[]>('/api/v1/fees/waivers');
}

export const feeApi = {
  getFeeDefinitions,
  getFeeById,
  createFeeDefinition,
  updateFeeDefinition,
  previewFee,
  previewCharge,
  chargeFee,
  waiveFee,
  getAccountFeeHistory,
  getFeeChargeHistory,
  getPendingWaivers,
  getAllWaivers,
  approveWaiver,
  rejectWaiver,
  reverseFeeCharge,
  createBulkFeeJob,
  getBulkFeeJobs,
  previewBulkFeeJob,
};
