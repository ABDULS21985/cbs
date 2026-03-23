import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
import type {
  LoanProduct,
  LoanApplication,
  LoanAccount,
  RepaymentScheduleItem,
  LoanFilters,
} from '../types/loan';

// ── Backend DTO shapes ────────────────────────────────────────────────────────

interface BackendLoanProductDto {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  loanType?: string | null;
  currencyCode?: string | null;
  minInterestRate?: number | null;
  maxInterestRate?: number | null;
  defaultInterestRate?: number | null;
  rateType?: string | null;
  minLoanAmount?: number | null;
  maxLoanAmount?: number | null;
  minTenureMonths?: number | null;
  maxTenureMonths?: number | null;
  requiresCollateral?: boolean | null;
  isIslamic?: boolean | null;
  isActive?: boolean | null;
}

interface BackendScheduleEntryDto {
  installmentNumber: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  penaltyDue?: number;
  penaltyPaid?: number;
  totalPaid: number;
  outstanding: number;
  paidDate?: string | null;
  status: string;
  overdue?: boolean;
}

interface BackendLoanApplicationResponse {
  id: number;
  applicationNumber: string;
  customerId: number;
  customerDisplayName?: string | null;
  loanProductCode: string;
  loanProductName?: string | null;
  requestedAmount: number;
  approvedAmount?: number | null;
  currencyCode?: string | null;
  requestedTenureMonths: number;
  purpose?: string | null;
  proposedRate?: number | null;
  approvedRate?: number | null;
  repaymentScheduleType?: string | null;
  creditScore?: number | null;
  riskGrade?: string | null;
  debtToIncomeRatio?: number | null;
  decisionEngineResult?: string | null;
  status: string;
  submittedAt?: string | null;
  declineReason?: string | null;
  createdAt?: string | null;
}

interface BackendLoanAccountResponse {
  id: number;
  loanNumber: string;
  customerId: number;
  customerDisplayName?: string | null;
  loanProductCode: string;
  loanProductName?: string | null;
  currencyCode?: string | null;
  disbursedAmount: number;
  outstandingPrincipal: number;
  interestRate: number;
  accruedInterest?: number | null;
  repaymentScheduleType?: string | null;
  repaymentFrequency?: string | null;
  tenureMonths: number;
  paidInstallments?: number | null;
  nextDueDate?: string | null;
  emiAmount?: number | null;
  daysPastDue?: number | null;
  delinquencyBucket?: string | null;
  provisionAmount?: number | null;
  disbursementDate?: string | null;
  maturityDate?: string | null;
  lastPaymentDate?: string | null;
  status: string;
  schedule?: BackendScheduleEntryDto[] | null;
}

// ── Mapping functions ─────────────────────────────────────────────────────────

function mapLoanProduct(p: BackendLoanProductDto): LoanProduct {
  return {
    id: p.id,
    productCode: p.code,
    productName: p.name,
    productType: p.loanType ?? p.code,
    currency: p.currencyCode ?? 'NGN',
    minAmount: p.minLoanAmount ?? 0,
    maxAmount: p.maxLoanAmount ?? 0,
    minTenorMonths: p.minTenureMonths ?? 1,
    maxTenorMonths: p.maxTenureMonths ?? 360,
    interestRateMin: p.minInterestRate ?? 0,
    interestRateMax: p.maxInterestRate ?? 0,
    defaultInterestRate: p.defaultInterestRate ?? undefined,
    requiresCollateral: p.requiresCollateral ?? false,
    description: p.description ?? undefined,
  };
}

function mapApplicationStatus(backendStatus: string): LoanApplication['status'] {
  const map: Record<string, LoanApplication['status']> = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    UNDER_REVIEW: 'PENDING_APPROVAL',
    CREDIT_CHECK: 'SCORING',
    APPROVED: 'APPROVED',
    CONDITIONALLY_APPROVED: 'APPROVED',
    OFFER_ISSUED: 'APPROVED',
    OFFER_ACCEPTED: 'DISBURSEMENT_PENDING',
    DISBURSED: 'DISBURSED',
    DECLINED: 'REJECTED',
    WITHDRAWN: 'CANCELLED',
    CANCELLED: 'CANCELLED',
  };
  return map[backendStatus] ?? 'DRAFT';
}

function mapLoanApplication(a: BackendLoanApplicationResponse): LoanApplication {
  return {
    id: a.id,
    applicationRef: a.applicationNumber,
    customerId: a.customerId,
    customerName: a.customerDisplayName ?? '',
    productCode: a.loanProductCode,
    productName: a.loanProductName ?? '',
    requestedAmount: a.requestedAmount,
    approvedAmount: a.approvedAmount ?? undefined,
    submittedDate: a.submittedAt ?? undefined,
    interestRate: a.proposedRate ?? a.approvedRate ?? 0,
    tenorMonths: a.requestedTenureMonths,
    purpose: a.purpose ?? '',
    repaymentMethod: (a.repaymentScheduleType as LoanApplication['repaymentMethod']) ?? 'EQUAL_INSTALLMENT',
    repaymentFrequency: 'MONTHLY',
    monthlyIncome: 0,
    monthlyExpenses: 0,
    debtToIncomeRatio: a.debtToIncomeRatio ?? 0,
    creditScore: a.creditScore ?? undefined,
    creditRating: a.riskGrade ?? undefined,
    scoringDecision: (a.decisionEngineResult as LoanApplication['scoringDecision']) ?? undefined,
    status: mapApplicationStatus(a.status),
    rejectionReason: a.declineReason ?? undefined,
    createdAt: a.createdAt ?? new Date().toISOString(),
    updatedAt: a.createdAt ?? new Date().toISOString(),
    version: 0,
  };
}

function mapAccountStatus(backendStatus: string): LoanAccount['status'] {
  const map: Record<string, LoanAccount['status']> = {
    PENDING_DISBURSEMENT: 'ACTIVE',
    ACTIVE: 'ACTIVE',
    DELINQUENT: 'ARREARS',
    DEFAULT: 'DEFAULT',
    RESTRUCTURED: 'RESTRUCTURED',
    WRITTEN_OFF: 'WRITTEN_OFF',
    CLOSED: 'SETTLED',
    SETTLED: 'SETTLED',
  };
  return map[backendStatus] ?? 'ACTIVE';
}

function mapDelinquencyBucket(bucket?: string | null): LoanAccount['classification'] {
  if (!bucket || bucket === 'CURRENT' || bucket === 'STAGE_1') return 'CURRENT';
  if (bucket === 'WATCH' || bucket === 'STAGE_2') return 'WATCH';
  if (bucket === 'SUBSTANDARD' || bucket === 'STAGE_3') return 'SUBSTANDARD';
  if (bucket === 'DOUBTFUL') return 'DOUBTFUL';
  if (bucket === 'LOST') return 'LOST';
  return 'CURRENT';
}

function mapLoanAccount(a: BackendLoanAccountResponse): LoanAccount {
  const accruedInterest = a.accruedInterest ?? 0;
  return {
    id: a.id,
    loanNumber: a.loanNumber,
    applicationId: 0,
    customerId: a.customerId,
    customerName: a.customerDisplayName ?? '',
    productCode: a.loanProductCode,
    productName: a.loanProductName ?? '',
    disbursedAmount: a.disbursedAmount,
    outstandingPrincipal: a.outstandingPrincipal,
    outstandingInterest: accruedInterest,
    totalOutstanding: a.outstandingPrincipal + accruedInterest,
    interestRate: a.interestRate,
    tenorMonths: a.tenureMonths,
    remainingMonths: a.tenureMonths - (a.paidInstallments ?? 0),
    monthlyPayment: a.emiAmount ?? 0,
    nextPaymentDate: a.nextDueDate ?? '',
    nextPaymentAmount: a.emiAmount ?? 0,
    daysPastDue: a.daysPastDue ?? 0,
    classification: mapDelinquencyBucket(a.delinquencyBucket),
    provisionAmount: a.provisionAmount ?? 0,
    currency: a.currencyCode ?? 'NGN',
    disbursedDate: a.disbursementDate ?? '',
    maturityDate: a.maturityDate ?? '',
    lastPaymentDate: a.lastPaymentDate ?? undefined,
    restructureCount: 0,
    status: mapAccountStatus(a.status),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 0,
  };
}

function mapScheduleEntry(e: BackendScheduleEntryDto): RepaymentScheduleItem {
  return {
    installmentNumber: e.installmentNumber,
    dueDate: e.dueDate,
    principalDue: e.principalDue,
    interestDue: e.interestDue,
    totalDue: e.totalDue,
    principalPaid: e.principalPaid,
    interestPaid: e.interestPaid,
    totalPaid: e.totalPaid,
    outstanding: e.outstanding,
    status: (e.status as RepaymentScheduleItem['status']) ?? 'FUTURE',
    paidDate: e.paidDate ?? undefined,
  };
}

// ── Request payload type ──────────────────────────────────────────────────────

export interface LoanApplicationRequest {
  customerId: number;
  loanProductCode: string;
  requestedAmount: number;
  requestedTenureMonths: number;
  purpose?: string;
  proposedRate?: number;
  repaymentScheduleType?: string;
  repaymentFrequency?: string;
  runCreditCheck?: boolean;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const loanApi = {
  // Products
  getProducts: (filters?: LoanFilters) =>
    apiGet<BackendLoanProductDto[]>('/api/v1/loans/products', filters as Record<string, unknown>)
      .then((list) => list.map(mapLoanProduct)),

  getIslamicProducts: () =>
    apiGet<BackendLoanProductDto[]>('/api/v1/loans/products/islamic')
      .then((list) => list.map(mapLoanProduct)),

  // Applications — list all with optional status filter
  listApplications: (params?: { status?: string; page?: number; size?: number }) =>
    apiGet<BackendLoanApplicationResponse[]>('/api/v1/loans/applications', params as Record<string, unknown>)
      .then((list) => list.map(mapLoanApplication)),

  submitApplication: (data: LoanApplicationRequest) =>
    apiPost<BackendLoanApplicationResponse>('/api/v1/loans/applications', data)
      .then(mapLoanApplication),

  getApplication: (id: number) =>
    apiGet<BackendLoanApplicationResponse>(`/api/v1/loans/applications/${id}`)
      .then(mapLoanApplication),

  getCustomerApplications: (customerId: number) =>
    apiGet<BackendLoanApplicationResponse[]>(`/api/v1/loans/applications/customer/${customerId}`)
      .then((list) => list.map(mapLoanApplication)),

  runCreditCheck: (applicationId: number) =>
    apiPost<unknown>(`/api/v1/loans/applications/${applicationId}/credit-check`, undefined),

  // Backend: POST /applications/{id}/approve with @RequestBody LoanApprovalRequest
  // LoanApprovalRequest: { approvedAmount, approvedTenureMonths, approvedRate, conditions }
  // approvedBy is set from the security context — NOT passed as a param
  approveApplication: (id: number, approval: { approvedAmount: number; approvedTenureMonths: number; approvedRate: number; conditions?: string[] }) =>
    apiPost<BackendLoanApplicationResponse>(
      `/api/v1/loans/applications/${id}/approve`,
      approval,
    ).then(mapLoanApplication),

  // Backend: POST /applications/{id}/decline?reason=... (@RequestParam String reason only)
  declineApplication: (id: number, reason: string) => {
    const params = new URLSearchParams({ reason });
    return api.post<{ data: BackendLoanApplicationResponse }>(
      `/api/v1/loans/applications/${id}/decline?${params}`,
    ).then((r) => mapLoanApplication(r.data.data));
  },

  disburse: (applicationId: number) =>
    apiPost<BackendLoanAccountResponse>(`/api/v1/loans/applications/${applicationId}/disburse`, undefined)
      .then(mapLoanAccount),

  // Active Loans
  getLoan: (id: number) =>
    apiGet<BackendLoanAccountResponse>(`/api/v1/loans/${id}`).then(mapLoanAccount),

  getLoanByNumber: (loanNumber: string) =>
    apiGet<BackendLoanAccountResponse>(`/api/v1/loans/number/${loanNumber}`).then(mapLoanAccount),

  getCustomerLoans: (customerId: number) =>
    apiGet<BackendLoanAccountResponse[]>(`/api/v1/loans/customer/${customerId}`)
      .then((list) => list.map(mapLoanAccount)),

  // Backend: GET /{loanId}/schedule returns List<ScheduleEntryDto> directly
  getSchedule: (loanId: number): Promise<RepaymentScheduleItem[]> =>
    apiGet<BackendScheduleEntryDto[]>(`/api/v1/loans/${loanId}/schedule`)
      .then((list) => list.map(mapScheduleEntry)),

  // Repayment — amount is passed as a query param per backend contract
  recordPayment: (loanId: number, amount: number) =>
    apiPost<BackendScheduleEntryDto>(`/api/v1/loans/${loanId}/repayment?amount=${amount}`, undefined),

  // ── Additional endpoints ────────────────────────────────────────────────────

  // Backend: GET / with search, page, size params — list all loans
  listLoans: (params?: { search?: string; page?: number; size?: number }) =>
    apiGet<BackendLoanAccountResponse[]>('/api/v1/loans', params as Record<string, unknown>)
      .then((list) => list.map(mapLoanAccount)),

  // Backend: GET /portfolio/stats — returns Map of portfolio statistics
  getPortfolioStats: () =>
    apiGet<Record<string, unknown>>('/api/v1/loans/portfolio/stats'),

  // Backend: GET /{loanId}/settlement-calculation — returns Map of settlement details
  getSettlementCalculation: (loanId: number) =>
    apiGet<Record<string, unknown>>(`/api/v1/loans/${loanId}/settlement-calculation`),

  // Backend: POST /schedule-preview with @RequestBody LoanApplicationRequest
  previewSchedule: (data: LoanApplicationRequest) =>
    apiPost<BackendScheduleEntryDto[]>('/api/v1/loans/schedule-preview', data)
      .then((list) => list.map(mapScheduleEntry)),

  // Backend: POST /batch/accrue-interest — admin batch operation
  batchAccrueInterest: () =>
    apiPost<Record<string, unknown>>('/api/v1/loans/batch/accrue-interest', undefined),
};
