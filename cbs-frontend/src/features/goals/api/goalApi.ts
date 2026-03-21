import { apiGet, apiPost } from '@/lib/api';

// ── Types aligned to backend GoalResponse DTO ────────────────────────────────

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'WITHDRAWN';
export type GoalTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'PENALTY' | 'REVERSAL';
export type AutoDebitFrequency = 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

export interface SavingsGoal {
  id: number;
  goalNumber: string;
  accountId: number;
  accountNumber: string;
  customerId: number;
  customerDisplayName: string;
  goalName: string;
  goalDescription: string | null;
  goalIcon: string | null;
  targetAmount: number;
  targetDate: string | null;
  currentAmount: number;
  progressPercentage: number;
  autoDebitEnabled: boolean;
  autoDebitAmount: number | null;
  autoDebitFrequency: AutoDebitFrequency | null;
  nextAutoDebitDate: string | null;
  interestBearing: boolean;
  interestRate: number;
  accruedInterest: number;
  status: GoalStatus;
  completedDate: string | null;
  isLocked: boolean;
  allowWithdrawalBeforeTarget: boolean;
  currencyCode: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Maps to backend SavingsGoalTransaction entity */
export interface GoalTransaction {
  id: number;
  transactionType: GoalTransactionType;
  amount: number;
  runningBalance: number;
  narration: string | null;
  sourceAccountId: number | null;
  transactionRef: string | null;
  createdAt: string;
  createdBy: string | null;
}

/** Raw entity from goals proxy endpoint — field names match JPA entity serialization */
export type RecurringDepositStatus = 'PENDING' | 'ACTIVE' | 'MATURED' | 'BROKEN' | 'CLOSED' | 'SUSPENDED';
export type DepositFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'MISSED' | 'LATE_PAID' | 'WAIVED';

export interface RecurringDeposit {
  id: number;
  depositNumber: string;
  currencyCode: string;
  installmentAmount: number;
  frequency: DepositFrequency;
  totalInstallments: number;
  completedInstallments: number;
  missedInstallments: number;
  nextDueDate: string;
  totalDeposited: number;
  accruedInterest: number;
  totalInterestEarned: number;
  currentValue: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  totalPenalties: number;
  maturityAction: string;
  autoDebit: boolean;
  status: RecurringDepositStatus;
  createdAt: string;
  // Nested entity refs (may be present from raw entity serialization)
  account?: { id: number; accountNumber: string };
  customer?: { id: number; displayName: string };
}

/** Maps to backend CreateGoalRequest DTO */
export interface CreateGoalRequest {
  customerId?: number;
  accountId: number;
  goalName: string;
  goalDescription?: string;
  goalIcon?: string;
  targetAmount: number;
  targetDate?: string;
  autoDebitEnabled?: boolean;
  autoDebitAmount?: number;
  autoDebitFrequency?: AutoDebitFrequency;
  autoDebitAccountId?: number;
  interestBearing?: boolean;
  interestRate?: number;
  isLocked?: boolean;
  allowWithdrawalBeforeTarget?: boolean;
  currencyCode?: string;
  metadata?: Record<string, unknown>;
}

/** Maps to backend GoalFundRequest DTO */
export interface GoalFundRequest {
  amount: number;
  sourceAccountId?: number;
  narration?: string;
}

export const goalApi = {
  // Goals CRUD
  getGoals: (params?: { page?: number; size?: number; status?: string; search?: string }) =>
    apiGet<SavingsGoal[]>('/api/v1/goals', params as Record<string, unknown>),

  getCustomerGoals: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<SavingsGoal[]>(`/api/v1/goals/customer/${customerId}`, params as Record<string, unknown>),

  getGoalById: (goalId: number | string) =>
    apiGet<SavingsGoal>(`/api/v1/goals/${goalId}`),

  createGoal: (data: CreateGoalRequest) =>
    apiPost<SavingsGoal>('/api/v1/goals', data),

  createGoalForCustomer: (customerId: number, data: CreateGoalRequest) =>
    apiPost<SavingsGoal>(`/api/v1/goals/customer/${customerId}`, data),

  // Goal Funding & Management
  contribute: (goalId: number | string, payload: GoalFundRequest) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/contribute`, payload),

  fund: (goalId: number | string, payload: GoalFundRequest) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/fund`, payload),

  withdraw: (goalId: number | string, payload: GoalFundRequest) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/withdraw`, payload),

  cancel: (goalId: number | string) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/cancel`),

  configureAutoDebit: (goalId: number | string, config: Record<string, unknown>) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/auto-debit`, config),

  getContributions: (goalId: number | string, params?: { page?: number; size?: number }) =>
    apiGet<GoalTransaction[]>(`/api/v1/goals/${goalId}/contributions`, params as Record<string, unknown>),

  processAutoDebits: () =>
    apiPost<{ processed: number }>('/api/v1/goals/batch/auto-debit'),

  // Recurring Deposits (proxy)
  getRecurringDeposits: () =>
    apiGet<RecurringDeposit[]>('/api/v1/goals/recurring-deposits'),

  getRecurringDepositById: (id: string) =>
    apiGet<RecurringDeposit>(`/api/v1/goals/recurring-deposits/${id}`),
};

// Legacy named exports for backward compatibility
export const getGoals = goalApi.getGoals;
export const getGoalById = goalApi.getGoalById;
export const createGoal = goalApi.createGoal;
export const contributeToGoal = (id: number | string, amount: number) =>
  goalApi.contribute(id, { amount });
export const updateAutoDebit = goalApi.configureAutoDebit;
export const getGoalContributions = goalApi.getContributions;
export const getRecurringDeposits = goalApi.getRecurringDeposits;
export const getRecurringDepositById = goalApi.getRecurringDepositById;

// ── Deposit Module API (real recurring deposit endpoints) ───────────────────

export interface RDInstallment {
  id: number;
  installmentNumber: number;
  dueDate: string;
  paidDate: string | null;
  amountDue: number;
  amountPaid: number;
  penaltyAmount: number;
  status: InstallmentStatus;
  transactionRef: string | null;
  overdue: boolean;
}

export interface RecurringDepositDetail {
  id: number;
  depositNumber: string;
  accountId: number;
  accountNumber: string;
  customerId: number;
  customerDisplayName: string;
  productCode: string;
  currencyCode: string;
  installmentAmount: number;
  frequency: DepositFrequency;
  totalInstallments: number;
  completedInstallments: number;
  missedInstallments: number;
  nextDueDate: string;
  totalDeposited: number;
  accruedInterest: number;
  totalInterestEarned: number;
  currentValue: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  totalPenalties: number;
  maturityAction: string;
  autoDebit: boolean;
  status: RecurringDepositStatus;
  installments: RDInstallment[];
  createdAt: string;
}

/** Maps to backend CreateRecurringDepositRequest DTO */
export interface CreateRecurringDepositInput {
  accountId: number;
  productCode: string;
  installmentAmount: number;
  frequency: DepositFrequency;
  totalInstallments: number;
  interestRate: number;
  dayCountConvention?: string;
  maturityAction?: string;
  payoutAccountId?: number;
  debitAccountId?: number;
  autoDebit?: boolean;
  missedPenaltyRate?: number;
}

export const recurringDepositApi = {
  getDetail: (id: string | number) => apiGet<RecurringDepositDetail>(`/api/v1/deposits/recurring/${id}`),

  create: (data: CreateRecurringDepositInput) => apiPost<RecurringDepositDetail>('/api/v1/deposits/recurring', data),

  payInstallment: (depositId: number, installmentNumber: number) =>
    apiPost<RDInstallment>(`/api/v1/deposits/recurring/${depositId}/installments/${installmentNumber}/pay`),

  processAutoDebits: () => apiPost<{ processed: number; failed: number }>('/api/v1/deposits/recurring/batch/auto-debit'),
};
