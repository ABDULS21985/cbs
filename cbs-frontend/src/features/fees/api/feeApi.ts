import { apiGet, apiPost } from '@/lib/api';
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

export interface FeePreviewResult {
  feeCode: string;
  calculatedAmount: number;
  vatAmount: number;
  totalAmount: number;
  breakdown: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

// GET /v1/fees/definitions
export function getFeeDefinitions(): Promise<FeeDefinition[]> {
  return apiGet<FeeDefinition[]>('/v1/fees/definitions').catch(() => []);
}

// POST /v1/fees/definitions
export function createFeeDefinition(data: Omit<FeeDefinition, 'id' | 'createdAt'>): Promise<FeeDefinition> {
  return apiPost<FeeDefinition>('/v1/fees/definitions', data);
}

// GET /v1/fees/preview/{feeCode}?amount=X
export function previewFee(feeCode: string, amount: number): Promise<FeePreviewResult> {
  return apiGet<FeePreviewResult>(`/v1/fees/preview/${encodeURIComponent(feeCode)}`, { amount });
}

// POST /v1/fees/charge?feeCode=X&accountId=Y&amount=Z&triggerRef=...
export async function chargeFee(
  feeCode: string,
  accountId: string,
  amount: number,
  triggerRef?: string,
): Promise<FeePreviewResult> {
  const params: Record<string, unknown> = { feeCode, accountId, amount };
  if (triggerRef) params.triggerRef = triggerRef;
  const { data } = await api.post<ApiResponse<FeePreviewResult>>('/v1/fees/charge', undefined, { params });
  return data.data;
}

// POST /v1/fees/waive/{chargeLogId}?waivedBy=X&reason=Y
export async function waiveFee(chargeLogId: string, waivedBy: string, reason: string): Promise<FeeCharge> {
  const { data } = await api.post<ApiResponse<FeeCharge>>(
    `/v1/fees/waive/${encodeURIComponent(chargeLogId)}`,
    undefined,
    { params: { waivedBy, reason } },
  );
  return data.data;
}

// GET /v1/fees/history/account/{accountId}
export function getAccountFeeHistory(accountId: string): Promise<FeeCharge[]> {
  return apiGet<FeeCharge[]>(`/v1/fees/history/account/${accountId}`).catch(() => []);
}
