import { apiGet, apiPost } from '@/lib/api';

export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  sourceAccountId: string;
  sourceAccountNumber: string;
  fundingMethod: 'MANUAL' | 'AUTO_DEBIT';
  autoDebit?: AutoDebitConfig;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  date: string;
  amount: number;
  source: string;
  type: 'MANUAL' | 'AUTO';
  runningTotal: number;
}

export interface RecurringDeposit {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  installmentsPaid: number;
  totalInstallments: number;
  status: 'ACTIVE' | 'COMPLETED' | 'MISSED' | 'PAUSED';
  nextDueDate: string;
  startDate: string;
  penalty?: number;
}

export interface AutoDebitConfig {
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  startDate: string;
  status: 'ACTIVE' | 'PAUSED';
}

export interface CreateGoalInput {
  name: string;
  icon: string;
  targetAmount: number;
  targetDate: string;
  sourceAccountId: string;
  fundingMethod: 'MANUAL' | 'AUTO_DEBIT';
  autoDebit?: Partial<AutoDebitConfig>;
}

export const goalApi = {
  // Goals
  getGoals: (params?: { page?: number; size?: number; status?: string }) =>
    apiGet<SavingsGoal[]>('/api/v1/goals', params as Record<string, unknown>).catch(() => []),

  getCustomerGoals: (customerId: number, params?: { page?: number; size?: number }) =>
    apiGet<SavingsGoal[]>(`/api/v1/goals/customer/${customerId}`, params as Record<string, unknown>).catch(() => []),

  getGoalById: (goalId: string) =>
    apiGet<SavingsGoal>(`/api/v1/goals/${goalId}`),

  createGoal: (data: CreateGoalInput) =>
    apiPost<SavingsGoal>('/api/v1/goals', data),

  createGoalForCustomer: (customerId: number, data: CreateGoalInput) =>
    apiPost<SavingsGoal>(`/api/v1/goals/customer/${customerId}`, data),

  contribute: (goalId: string, payload: { amount: number; sourceAccountId?: string }) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/contribute`, payload),

  fund: (goalId: string, payload: { amount: number }) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/fund`, payload),

  withdraw: (goalId: string, payload: { amount: number }) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/withdraw`, payload),

  cancel: (goalId: string) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/cancel`),

  configureAutoDebit: (goalId: string, config: AutoDebitConfig) =>
    apiPost<SavingsGoal>(`/api/v1/goals/${goalId}/auto-debit`, config),

  getContributions: (goalId: string, params?: { page?: number; size?: number }) =>
    apiGet<GoalContribution[]>(`/api/v1/goals/${goalId}/contributions`, params as Record<string, unknown>).catch(() => []),

  processAutoDebits: () =>
    apiPost<{ processed: number }>('/api/v1/goals/batch/auto-debits'),

  // Recurring Deposits
  getRecurringDeposits: () =>
    apiGet<RecurringDeposit[]>('/api/v1/goals/recurring-deposits').catch(() => []),

  getRecurringDepositById: (id: string) =>
    apiGet<RecurringDeposit>(`/api/v1/goals/recurring-deposits/${id}`),
};

// Legacy named exports for backward compatibility
export const getGoals = goalApi.getGoals;
export const getGoalById = goalApi.getGoalById;
export const createGoal = goalApi.createGoal;
export const contributeToGoal = (id: string, amount: number) => goalApi.contribute(id, { amount });
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
  status: string;
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
  frequency: string;
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
  status: string;
  installments: RDInstallment[];
  createdAt: string;
}

export interface CreateRecurringDepositInput {
  customerId: number;
  amount: number;
  frequency: string;
  totalInstallments: number;
  startDate: string;
  sourceAccountId?: number;
}

export const recurringDepositApi = {
  getDetail: (id: string | number) => apiGet<RecurringDepositDetail>(`/api/v1/deposits/recurring/${id}`),

  create: (data: CreateRecurringDepositInput) => apiPost<RecurringDepositDetail>('/api/v1/deposits/recurring', data),

  payInstallment: (depositId: number, installmentNumber: number) =>
    apiPost<RDInstallment>(`/api/v1/deposits/recurring/${depositId}/installments/${installmentNumber}/pay`),

  processAutoDebits: () => apiPost<{ processed: number; failed: number }>('/api/v1/deposits/recurring/batch/auto-debit'),
};
