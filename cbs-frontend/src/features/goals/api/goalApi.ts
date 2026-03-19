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
  autoDebit?: {
    amount: number;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    startDate: string;
    status: 'ACTIVE' | 'PAUSED';
  };
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

// ---- API Functions ----

export function getGoals(): Promise<SavingsGoal[]> {
  return apiGet<SavingsGoal[]>('/api/v1/goals').catch(() => []);
}

export function getGoalById(id: string): Promise<SavingsGoal | undefined> {
  return apiGet<SavingsGoal>(`/api/v1/goals/${id}`).catch(() => undefined);
}

export function createGoal(data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'status'>): Promise<SavingsGoal> {
  return apiPost<SavingsGoal>('/api/v1/goals', data);
}

export function contributeToGoal(id: string, amount: number): Promise<SavingsGoal> {
  return apiPost<SavingsGoal>(`/api/v1/goals/${id}/contribute`, { amount });
}

export function updateAutoDebit(id: string, config: AutoDebitConfig): Promise<SavingsGoal> {
  return apiPost<SavingsGoal>(`/api/v1/goals/${id}/auto-debit`, config);
}

export function getGoalContributions(id: string): Promise<GoalContribution[]> {
  return apiGet<GoalContribution[]>(`/api/v1/goals/${id}/contributions`).catch(() => []);
}

export function getRecurringDeposits(): Promise<RecurringDeposit[]> {
  return apiGet<RecurringDeposit[]>('/api/v1/goals/recurring-deposits').catch(() => []);
}

export function getRecurringDepositById(id: string): Promise<RecurringDeposit | undefined> {
  return apiGet<RecurringDeposit>(`/api/v1/goals/recurring-deposits/${id}`).catch(() => undefined);
}
