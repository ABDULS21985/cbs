import { apiGet, apiPost, apiPut } from '@/lib/api';
import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';

export type FeeCategory =
  | 'ACCOUNT_MAINTENANCE' | 'TRANSACTION' | 'CARD' | 'LOAN_PROCESSING'
  | 'STATEMENT' | 'CHEQUE' | 'SWIFT' | 'ATM' | 'POS' | 'ONLINE'
  | 'PENALTY' | 'COMMISSION' | 'SERVICE_CHARGE' | 'OTHER';
export type FeeCalcType = 'FLAT' | 'PERCENTAGE' | 'TIERED' | 'SLAB' | 'MIN_OF' | 'MAX_OF';
export type FeeSchedule = 'PER_TRANSACTION' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type WaiverAuthority = 'OFFICER' | 'MANAGER' | 'ADMIN';

export interface FeeTier {
  fromAmount: number;
  toAmount: number;
  rate: number;
  flatFee: number;
}

/**
 * FeeDefinition — frontend model.
 *
 * Backend JPA field        → frontend alias
 * ─────────────────────────────────────────
 * feeCode                  → code
 * feeName                  → name
 * feeCategory              → category
 * calculationType          → calcType
 * taxApplicable            → vatApplicable
 * taxRate                  → vatRate
 * feeIncomeGlCode          → glIncomeAccount
 * taxGlCode                → glReceivableAccount
 * isActive                 → status ('ACTIVE'|'INACTIVE')
 * waiverAuthorityLevel     → waiverAuthority
 * tierConfig               → tiers (FeeTier[])
 * applicableProducts (csv) → applicableProducts (string[])
 */
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
  triggerEvent?: string;
  currencyCode?: string;
  applicableChannels?: string;
  applicableCustomerTypes?: string;
  taxCode?: string;
  waivable?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

// ── Raw backend shapes (Jackson-serialized JPA entities) ─────────────────────

/** Raw FeeDefinition entity as returned by Spring Boot (no DTO layer). */
interface RawFeeDefinition {
  id: number;
  feeCode: string;
  feeName: string;
  feeCategory: FeeCategory;
  calculationType: FeeCalcType;
  flatAmount?: number;
  percentage?: number;
  minFee?: number;
  maxFee?: number;
  currencyCode?: string;
  tierConfig?: Array<{ min: number; max: number; rate: number; flat: number }>;
  applicableProducts?: string;
  applicableChannels?: string;
  applicableCustomerTypes?: string;
  taxApplicable: boolean;
  taxRate?: number;
  taxCode?: string;
  feeIncomeGlCode?: string;
  taxGlCode?: string;
  waivable?: boolean;
  waiverAuthorityLevel?: string;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  triggerEvent?: string;
  // Not present in entity but kept for forward-compat
  description?: string;
  schedule?: FeeSchedule;
  onAmount?: 'DEBIT' | 'CREDIT' | 'BALANCE';
  createdAt?: string;
}

/** Raw FeeChargeLog entity as returned by Spring Boot. */
interface RawFeeChargeLog {
  id: number;
  feeCode: string;
  accountId: number;
  customerId: number;
  baseAmount: number;
  feeAmount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  triggerEvent: string;
  triggerRef?: string;
  triggerAmount?: number;
  wasWaived: boolean;
  waivedBy?: string;
  waiverReason?: string;
  status: string;
  chargedAt: string;
  createdAt: string;
}

// ── Response mappers ─────────────────────────────────────────────────────────

function mapFeeDefinition(raw: RawFeeDefinition): FeeDefinition {
  return {
    id: String(raw.id),
    code: raw.feeCode,
    name: raw.feeName,
    category: raw.feeCategory,
    calcType: raw.calculationType,
    flatAmount: raw.flatAmount,
    percentage: raw.percentage,
    minFee: raw.minFee,
    maxFee: raw.maxFee,
    onAmount: raw.onAmount,
    tiers: raw.tierConfig?.map(t => ({
      fromAmount: t.min,
      toAmount: t.max,
      rate: t.rate,
      flatFee: t.flat,
    })),
    vatApplicable: raw.taxApplicable ?? false,
    vatRate: raw.taxRate,
    schedule: raw.schedule ?? 'PER_TRANSACTION',
    waiverAuthority: (raw.waiverAuthorityLevel as WaiverAuthority) ?? 'OFFICER',
    glIncomeAccount: raw.feeIncomeGlCode ?? '',
    glReceivableAccount: raw.taxGlCode ?? '',
    applicableProducts: raw.applicableProducts
      ? raw.applicableProducts.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    status: raw.isActive ? 'ACTIVE' : 'INACTIVE',
    description: raw.description,
    createdAt: raw.createdAt ?? '',
    triggerEvent: raw.triggerEvent,
    currencyCode: raw.currencyCode,
    applicableChannels: raw.applicableChannels,
    applicableCustomerTypes: raw.applicableCustomerTypes,
    taxCode: raw.taxCode,
    waivable: raw.waivable,
    effectiveFrom: raw.effectiveFrom,
    effectiveTo: raw.effectiveTo,
  };
}

function mapFeeChargeLog(raw: RawFeeChargeLog): FeeCharge {
  return {
    id: String(raw.id),
    feeId: raw.feeCode,
    feeName: raw.feeCode, // backend has no feeName on charge log
    accountId: String(raw.accountId),
    accountNumber: String(raw.accountId), // best we have from the entity
    customerName: String(raw.customerId),
    amount: raw.feeAmount,
    vatAmount: raw.taxAmount,
    date: raw.chargedAt,
    status: raw.status as FeeCharge['status'],
    waivedBy: raw.waivedBy,
    waivedReason: raw.waiverReason,
    transactionRef: raw.triggerRef,
  };
}

// ── Request mapper: frontend FeeDefinition → backend entity shape ────────────

function toBackendFeeDefinition(
  data: Omit<FeeDefinition, 'id' | 'createdAt'> & { id?: string },
): Record<string, unknown> {
  return {
    ...(data.id ? { id: Number(data.id) } : {}),
    feeCode: data.code,
    feeName: data.name,
    feeCategory: data.category,
    calculationType: data.calcType,
    flatAmount: data.flatAmount,
    percentage: data.percentage,
    minFee: data.minFee,
    maxFee: data.maxFee,
    currencyCode: data.currencyCode ?? 'NGN',
    tierConfig: data.tiers?.map(t => ({
      min: t.fromAmount,
      max: t.toAmount,
      rate: t.rate,
      flat: t.flatFee,
    })),
    applicableProducts: Array.isArray(data.applicableProducts)
      ? data.applicableProducts.join(',')
      : data.applicableProducts,
    applicableChannels: data.applicableChannels ?? 'ALL',
    applicableCustomerTypes: data.applicableCustomerTypes ?? 'ALL',
    taxApplicable: data.vatApplicable,
    taxRate: data.vatRate,
    taxCode: data.taxCode,
    feeIncomeGlCode: data.glIncomeAccount,
    taxGlCode: data.glReceivableAccount,
    waivable: data.waivable ?? true,
    waiverAuthorityLevel: data.waiverAuthority,
    isActive: data.status === 'ACTIVE',
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo,
    triggerEvent: data.triggerEvent ?? data.category,
  };
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

// ── Backend fee result shape from FeeEngine.FeeResult ─────────────────────────

interface BackendFeeResult {
  feeCode?: string;
  feeAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currencyCode?: string;
  calculationType?: string;
  baseAmount?: number;
  // Legacy/compat fields some endpoints may include
  feeName?: string;
  vatAmount?: number;
  breakdown?: string;
}

function mapFeeResult(raw: BackendFeeResult): FeePreviewResult {
  return {
    feeCode: raw.feeCode ?? '',
    calculatedAmount: raw.feeAmount ?? 0,
    vatAmount: raw.taxAmount ?? raw.vatAmount ?? 0,
    totalAmount: raw.totalAmount ?? 0,
    breakdown: raw.breakdown ?? `${raw.calculationType ?? 'FLAT'} on ${raw.baseAmount ?? 0}`,
  };
}

// ── API Functions ─────────────────────────────────────────────────────────────

// GET /v1/fees/definitions
export async function getFeeDefinitions(): Promise<FeeDefinition[]> {
  const raw = await apiGet<RawFeeDefinition[]>('/api/v1/fees/definitions');
  return raw.map(mapFeeDefinition);
}

// GET /v1/fees/definitions/{id}
export async function getFeeById(id: string): Promise<FeeDefinition> {
  const raw = await apiGet<RawFeeDefinition>(`/api/v1/fees/definitions/${encodeURIComponent(id)}`);
  return mapFeeDefinition(raw);
}

// POST /v1/fees/definitions
export async function createFeeDefinition(data: Omit<FeeDefinition, 'id' | 'createdAt'>): Promise<FeeDefinition> {
  const raw = await apiPost<RawFeeDefinition>('/api/v1/fees/definitions', toBackendFeeDefinition(data));
  return mapFeeDefinition(raw);
}

// PUT /v1/fees/definitions/{id}
export async function updateFeeDefinition(id: string, data: Partial<FeeDefinition>): Promise<FeeDefinition> {
  const payload = toBackendFeeDefinition({ ...data, id } as Omit<FeeDefinition, 'id' | 'createdAt'> & { id: string });
  const raw = await apiPut<RawFeeDefinition>(`/api/v1/fees/definitions/${id}`, payload);
  return mapFeeDefinition(raw);
}

// GET /v1/fees/preview/{feeCode}?amount=X — returns FeeEngine.FeeResult
export async function previewFee(feeCode: string, amount: number): Promise<FeePreviewResult> {
  const raw = await apiGet<BackendFeeResult>(`/api/v1/fees/preview/${encodeURIComponent(feeCode)}`, { amount });
  return mapFeeResult(raw);
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
  })();

  const applicableFees = results.map((r) => ({
    feeId: r.feeCode ?? '',
    feeName: r.feeName ?? r.feeCode ?? '',
    calculatedAmount: r.feeAmount ?? r.totalAmount ?? 0,
    vatAmount: r.taxAmount ?? r.vatAmount ?? 0,
    breakdown: r.breakdown ?? `${r.calculationType ?? 'FLAT'} on ${r.baseAmount ?? 0}`,
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

// POST /v1/fees/charge?feeCode=X&accountId=Y&amount=Z — returns FeeEngine.FeeResult
export async function chargeFee(
  feeCode: string,
  accountId: string,
  amount: number,
  triggerRef?: string,
): Promise<FeePreviewResult> {
  const params: Record<string, unknown> = { feeCode, accountId, amount };
  if (triggerRef) params.triggerRef = triggerRef;
  const { data } = await api.post<ApiResponse<BackendFeeResult>>('/api/v1/fees/charge', undefined, { params });
  return mapFeeResult(data.data);
}

// POST /v1/fees/waive/{chargeLogId}?reason=Y
// Note: backend uses currentActorProvider for waivedBy, so waivedBy param is ignored server-side.
export async function waiveFee(chargeLogId: string, _waivedBy: string, reason: string): Promise<FeeCharge> {
  const { data } = await api.post<ApiResponse<RawFeeChargeLog>>(
    `/api/v1/fees/waive/${encodeURIComponent(chargeLogId)}`,
    undefined,
    { params: { reason } },
  );
  return mapFeeChargeLog(data.data);
}

// GET /v1/fees/history/account/{accountId}?page=X&size=Y
export async function getAccountFeeHistory(
  accountId: string,
  page = 0,
  size = 50,
): Promise<FeeCharge[]> {
  const { data } = await api.get<ApiResponse<RawFeeChargeLog[]>>(
    `/api/v1/fees/history/account/${accountId}`,
    { params: { page, size } },
  );
  return (data.data ?? []).map(mapFeeChargeLog);
}

// GET /v1/fees/charge?page=X&size=Y — list all charge logs (paginated)
export async function listCharges(page = 0, size = 50): Promise<FeeCharge[]> {
  const { data } = await api.get<ApiResponse<RawFeeChargeLog[]>>(
    '/api/v1/fees/charge',
    { params: { page, size } },
  );
  return (data.data ?? []).map(mapFeeChargeLog);
}

// Backward-compat alias — require an identifier instead of silently pretending history is empty.
export function getFeeChargeHistory(feeId?: string): Promise<FeeCharge[]> {
  if (!feeId) {
    return Promise.reject(new Error('Fee charge history requires a fee or account identifier.'));
  }
  return getAccountFeeHistory(feeId);
}

// GET /v1/fees/waivers/pending — returns FeeChargeLog[] with status=PENDING
export async function getPendingWaivers(): Promise<FeeWaiver[]> {
  const { data } = await api.get<ApiResponse<RawFeeChargeLog[]>>('/api/v1/fees/waivers/pending');
  return (data.data ?? []).map((raw) => ({
    id: String(raw.id),
    chargeId: String(raw.id),
    feeId: raw.feeCode,
    accountId: String(raw.accountId),
    amount: raw.feeAmount + raw.taxAmount,
    reason: raw.waiverReason ?? '',
    requestedBy: raw.waivedBy ?? '',
    authorizedBy: undefined,
    status: 'PENDING' as const,
    createdAt: raw.createdAt,
  }));
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

// POST /v1/fees/waivers/{waiverId}/reject — backend returns FeeChargeLog
export async function rejectWaiver(waiverId: string, reason: string): Promise<FeeWaiver> {
  const { data } = await api.post<ApiResponse<RawFeeChargeLog>>(
    `/api/v1/fees/waivers/${waiverId}/reject`,
    { reason },
  );
  const raw = data.data;
  return {
    id: String(raw.id),
    chargeId: String(raw.id),
    feeId: raw.feeCode,
    accountId: String(raw.accountId),
    amount: raw.feeAmount + raw.taxAmount,
    reason: raw.waiverReason ?? reason,
    requestedBy: raw.waivedBy ?? '',
    authorizedBy: undefined,
    status: 'REJECTED' as const,
    createdAt: raw.createdAt,
  };
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
// Reversal is implemented as a waive with status set to REVERSED by the backend.
// If the dedicated /charges/{id}/reverse endpoint doesn't exist, fall back to waive.
export async function reverseFeeCharge(chargeLogId: string): Promise<FeeCharge> {
  try {
    const { data } = await api.post<ApiResponse<RawFeeChargeLog>>(
      `/api/v1/fees/charges/${chargeLogId}/reverse`,
    );
    return mapFeeChargeLog(data.data);
  } catch (err: unknown) {
    // Fallback: if reverse endpoint returns 404, use waive with reversal reason
    const axErr = err as { response?: { status?: number } };
    if (axErr?.response?.status === 404 || axErr?.response?.status === 405) {
      return waiveFee(chargeLogId, '', 'Fee charge reversed');
    }
    throw err;
  }
}

// GET /v1/fees/waivers — all waivers (not just pending). Backend returns FeeChargeLog[].
export async function getAllWaivers(): Promise<FeeWaiver[]> {
  const { data } = await api.get<ApiResponse<RawFeeChargeLog[]>>('/api/v1/fees/waivers');
  return (data.data ?? []).map((raw) => ({
    id: String(raw.id),
    chargeId: String(raw.id),
    feeId: raw.feeCode,
    accountId: String(raw.accountId),
    amount: raw.feeAmount + raw.taxAmount,
    reason: raw.waiverReason ?? '',
    requestedBy: raw.waivedBy ?? '',
    authorizedBy: raw.wasWaived ? raw.waivedBy : undefined,
    status: (raw.status === 'WAIVED' ? 'APPROVED' : raw.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as FeeWaiver['status'],
    createdAt: raw.createdAt,
  }));
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
  listCharges,
  getPendingWaivers,
  getAllWaivers,
  approveWaiver,
  rejectWaiver,
  reverseFeeCharge,
  createBulkFeeJob,
  getBulkFeeJobs,
  previewBulkFeeJob,
};
