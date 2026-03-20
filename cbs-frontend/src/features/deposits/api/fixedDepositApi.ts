import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface FixedDeposit {
  id: string;
  fdNumber: string;
  customerId: string;
  customerName: string;
  sourceAccountId: string;
  sourceAccountNumber: string;
  principalAmount: number;
  currency: string;
  interestRate: number;
  tenor: number;
  tenorUnit: 'DAYS';
  startDate: string;
  maturityDate: string;
  grossInterest: number;
  wht: number;
  netInterest: number;
  maturityValue: number;
  maturityInstruction: 'ROLLOVER_ALL' | 'ROLLOVER_PRINCIPAL' | 'LIQUIDATE' | 'MANUAL';
  destinationAccountId?: string;
  status: 'ACTIVE' | 'MATURED' | 'LIQUIDATED' | 'ROLLED_OVER';
  rolloverCount?: number;
  parentFdId?: string;
}

export interface RateTable {
  tenor: number;
  tenorLabel: string;
  standardRate: number;
  premiumRate: number;
}

export interface InterestCalcParams {
  principal: number;
  rate: number;
  tenor: number;
}

export interface InterestCalcResult {
  principal: number;
  rate: number;
  tenor: number;
  grossInterest: number;
  wht: number;
  netInterest: number;
  maturityValue: number;
}

export interface FdStats {
  totalBalance: number;
  activeFds: number;
  maturingSoon: number;
  averageRate: number;
}

export interface EarlyWithdrawalInfo {
  penaltyRate: number;
  penaltyAmount: number;
  accruedInterest: number;
  netProceeds: number;
  breakDate: string;
}

export interface MaturityInstruction {
  type: 'ROLLOVER_ALL' | 'ROLLOVER_PRINCIPAL' | 'LIQUIDATE' | 'MANUAL';
  destinationAccountId?: string;
}

export interface CreateFdRequest {
  customerId: string;
  sourceAccountId: string;
  principalAmount: number;
  currency: string;
  tenor: number;
  rate: number;
  maturityInstruction: MaturityInstruction;
}

export const fixedDepositApi = {
  getFixedDeposits: (params: { status?: string; page?: number; pageSize?: number }): Promise<FixedDeposit[]> =>
    apiGet<FixedDeposit[]>('/api/v1/deposits/fixed', params as Record<string, unknown>),

  getFixedDeposit: (id: string): Promise<FixedDeposit> =>
    apiGet<FixedDeposit>(`/api/v1/deposits/fixed/${id}`),

  createFixedDeposit: (data: CreateFdRequest): Promise<FixedDeposit> =>
    apiPost<FixedDeposit>('/api/v1/deposits/fixed', data),

  getRateTables: (): Promise<RateTable[]> =>
    apiGet<RateTable[]>('/api/v1/deposits/fixed/rates'),

  calculateInterest: (params: InterestCalcParams): Promise<InterestCalcResult> =>
    apiPost<InterestCalcResult>('/api/v1/deposits/fixed/calculate', params),

  getEarlyWithdrawal: (id: string): Promise<EarlyWithdrawalInfo> =>
    apiGet<EarlyWithdrawalInfo>(`/api/v1/deposits/fixed/${id}/early-withdrawal`),

  liquidate: (id: string, reason: string): Promise<void> =>
    apiPost<void>(`/api/v1/deposits/fixed/${id}/liquidate`, { reason }),

  updateMaturityInstruction: (id: string, instruction: MaturityInstruction): Promise<FixedDeposit> =>
    apiPatch<FixedDeposit>(`/api/v1/deposits/fixed/${id}/maturity-instruction`, instruction),

  getStats: (): Promise<FdStats> =>
    apiGet<FdStats>('/api/v1/deposits/fixed/stats'),

  partialLiquidate: (id: string, amount: number, reason: string): Promise<void> =>
    apiPost<void>(`/api/v1/deposits/fixed/${id}/partial-liquidate`, { amount, reason }),

  terminate: (id: string, reason: string): Promise<void> =>
    apiPost<void>(`/api/v1/deposits/fixed/${id}/terminate`, { reason }),

  getCustomerFds: (customerId: string): Promise<FixedDeposit[]> =>
    apiGet<FixedDeposit[]>(`/api/v1/deposits/fixed/customer/${customerId}`),

  batchProcessMaturity: (): Promise<{ processed: number; rolledOver: number; liquidated: number; failed: number }> =>
    apiPost<{ processed: number; rolledOver: number; liquidated: number; failed: number }>('/api/v1/deposits/fixed/batch/maturity'),

  batchAccrueInterest: (): Promise<{ accrued: number; totalInterest: number; exceptions: number }> =>
    apiPost<{ accrued: number; totalInterest: number; exceptions: number }>('/api/v1/deposits/fixed/batch/accrue'),

  getByNumber: (depositNumber: string): Promise<FixedDeposit> =>
    apiGet<FixedDeposit>(`/api/v1/deposits/fixed/${depositNumber}`),
};
