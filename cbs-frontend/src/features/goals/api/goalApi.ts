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

// ---- Mock Data ----

const MOCK_GOALS: SavingsGoal[] = [
  {
    id: 'goal-001',
    name: 'New Home Purchase',
    icon: '🏠',
    targetAmount: 15_000_000,
    currentAmount: 8_750_000,
    targetDate: '2026-12-31',
    sourceAccountId: 'acc-001',
    sourceAccountNumber: '0123456789',
    fundingMethod: 'AUTO_DEBIT',
    autoDebit: {
      amount: 500_000,
      frequency: 'MONTHLY',
      startDate: '2025-01-01',
      status: 'ACTIVE',
    },
    status: 'ACTIVE',
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: 'goal-002',
    name: 'University Education',
    icon: '🎓',
    targetAmount: 5_000_000,
    currentAmount: 2_100_000,
    targetDate: '2027-09-01',
    sourceAccountId: 'acc-001',
    sourceAccountNumber: '0123456789',
    fundingMethod: 'AUTO_DEBIT',
    autoDebit: {
      amount: 150_000,
      frequency: 'MONTHLY',
      startDate: '2025-03-01',
      status: 'ACTIVE',
    },
    status: 'ACTIVE',
    createdAt: '2025-03-01T09:00:00Z',
  },
  {
    id: 'goal-003',
    name: 'International Vacation',
    icon: '✈️',
    targetAmount: 2_500_000,
    currentAmount: 950_000,
    targetDate: '2026-06-30',
    sourceAccountId: 'acc-002',
    sourceAccountNumber: '0987654321',
    fundingMethod: 'MANUAL',
    status: 'ACTIVE',
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'goal-004',
    name: 'Emergency Fund',
    icon: '🏥',
    targetAmount: 3_000_000,
    currentAmount: 3_000_000,
    targetDate: '2025-12-31',
    sourceAccountId: 'acc-001',
    sourceAccountNumber: '0123456789',
    fundingMethod: 'AUTO_DEBIT',
    autoDebit: {
      amount: 100_000,
      frequency: 'MONTHLY',
      startDate: '2025-01-01',
      status: 'PAUSED',
    },
    status: 'COMPLETED',
    createdAt: '2025-01-01T07:00:00Z',
  },
  {
    id: 'goal-005',
    name: 'New Laptop',
    icon: '💻',
    targetAmount: 800_000,
    currentAmount: 320_000,
    targetDate: '2026-03-31',
    sourceAccountId: 'acc-002',
    sourceAccountNumber: '0987654321',
    fundingMethod: 'MANUAL',
    status: 'PAUSED',
    createdAt: '2025-09-01T11:00:00Z',
  },
  {
    id: 'goal-006',
    name: 'Wedding Ring',
    icon: '💍',
    targetAmount: 1_200_000,
    currentAmount: 480_000,
    targetDate: '2026-07-15',
    sourceAccountId: 'acc-001',
    sourceAccountNumber: '0123456789',
    fundingMethod: 'AUTO_DEBIT',
    autoDebit: {
      amount: 60_000,
      frequency: 'MONTHLY',
      startDate: '2025-08-01',
      status: 'ACTIVE',
    },
    status: 'ACTIVE',
    createdAt: '2025-08-01T14:00:00Z',
  },
];

const MOCK_CONTRIBUTIONS: Record<string, GoalContribution[]> = {
  'goal-001': [
    { id: 'c-001', goalId: 'goal-001', date: '2026-03-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 8_750_000 },
    { id: 'c-002', goalId: 'goal-001', date: '2026-02-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 8_250_000 },
    { id: 'c-003', goalId: 'goal-001', date: '2026-01-15T14:30:00Z', amount: 750_000, source: 'Manual Transfer', type: 'MANUAL', runningTotal: 7_750_000 },
    { id: 'c-004', goalId: 'goal-001', date: '2026-01-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 7_000_000 },
    { id: 'c-005', goalId: 'goal-001', date: '2025-12-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 6_500_000 },
    { id: 'c-006', goalId: 'goal-001', date: '2025-11-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 6_000_000 },
    { id: 'c-007', goalId: 'goal-001', date: '2025-10-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 5_500_000 },
    { id: 'c-008', goalId: 'goal-001', date: '2025-09-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 5_000_000 },
    { id: 'c-009', goalId: 'goal-001', date: '2025-08-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 4_500_000 },
    { id: 'c-010', goalId: 'goal-001', date: '2025-07-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 4_000_000 },
    { id: 'c-011', goalId: 'goal-001', date: '2025-06-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 3_500_000 },
    { id: 'c-012', goalId: 'goal-001', date: '2025-05-01T10:00:00Z', amount: 500_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 3_000_000 },
  ],
  'goal-002': [
    { id: 'c-101', goalId: 'goal-002', date: '2026-03-01T10:00:00Z', amount: 150_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 2_100_000 },
    { id: 'c-102', goalId: 'goal-002', date: '2026-02-01T10:00:00Z', amount: 150_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 1_950_000 },
    { id: 'c-103', goalId: 'goal-002', date: '2026-01-01T10:00:00Z', amount: 150_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 1_800_000 },
    { id: 'c-104', goalId: 'goal-002', date: '2025-12-20T15:00:00Z', amount: 300_000, source: 'Manual Transfer', type: 'MANUAL', runningTotal: 1_650_000 },
    { id: 'c-105', goalId: 'goal-002', date: '2025-12-01T10:00:00Z', amount: 150_000, source: 'Auto-Debit (0123456789)', type: 'AUTO', runningTotal: 1_350_000 },
  ],
};

const MOCK_RECURRING_DEPOSITS: RecurringDeposit[] = [
  {
    id: 'rd-001',
    customerId: 'cust-001',
    customerName: 'Aminu Garba',
    amount: 50_000,
    frequency: 'MONTHLY',
    installmentsPaid: 18,
    totalInstallments: 24,
    status: 'ACTIVE',
    nextDueDate: '2026-04-01',
    startDate: '2024-10-01',
  },
  {
    id: 'rd-002',
    customerId: 'cust-002',
    customerName: 'Ngozi Okonkwo',
    amount: 25_000,
    frequency: 'WEEKLY',
    installmentsPaid: 52,
    totalInstallments: 52,
    status: 'COMPLETED',
    nextDueDate: '2026-01-01',
    startDate: '2025-01-01',
  },
  {
    id: 'rd-003',
    customerId: 'cust-003',
    customerName: 'Ibrahim Musa',
    amount: 100_000,
    frequency: 'MONTHLY',
    installmentsPaid: 5,
    totalInstallments: 12,
    status: 'MISSED',
    nextDueDate: '2026-03-01',
    startDate: '2025-10-01',
    penalty: 5_000,
  },
  {
    id: 'rd-004',
    customerId: 'cust-004',
    customerName: 'Aisha Bello',
    amount: 10_000,
    frequency: 'DAILY',
    installmentsPaid: 30,
    totalInstallments: 90,
    status: 'ACTIVE',
    nextDueDate: '2026-03-20',
    startDate: '2026-01-19',
  },
  {
    id: 'rd-005',
    customerId: 'cust-005',
    customerName: 'Chidi Ezeh',
    amount: 75_000,
    frequency: 'MONTHLY',
    installmentsPaid: 2,
    totalInstallments: 6,
    status: 'PAUSED',
    nextDueDate: '2026-04-01',
    startDate: '2026-01-01',
  },
  {
    id: 'rd-006',
    customerId: 'cust-006',
    customerName: 'Fatima Aliyu',
    amount: 30_000,
    frequency: 'WEEKLY',
    installmentsPaid: 8,
    totalInstallments: 26,
    status: 'ACTIVE',
    nextDueDate: '2026-03-22',
    startDate: '2026-01-11',
  },
];

// ---- Simulate network delay ----

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- API Functions ----

export async function getGoals(): Promise<SavingsGoal[]> {
  await delay();
  return [...MOCK_GOALS];
}

export async function getGoalById(id: string): Promise<SavingsGoal | undefined> {
  await delay(300);
  return MOCK_GOALS.find((g) => g.id === id);
}

export async function createGoal(data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt' | 'status'>): Promise<SavingsGoal> {
  await delay(600);
  const newGoal: SavingsGoal = {
    ...data,
    id: `goal-${Date.now()}`,
    currentAmount: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };
  MOCK_GOALS.push(newGoal);
  return newGoal;
}

export async function contributeToGoal(id: string, amount: number): Promise<SavingsGoal> {
  await delay(500);
  const goal = MOCK_GOALS.find((g) => g.id === id);
  if (!goal) throw new Error('Goal not found');
  goal.currentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
  if (goal.currentAmount >= goal.targetAmount) {
    goal.status = 'COMPLETED';
  }
  const contributions = MOCK_CONTRIBUTIONS[id] || [];
  const newContribution: GoalContribution = {
    id: `c-${Date.now()}`,
    goalId: id,
    date: new Date().toISOString(),
    amount,
    source: 'Manual Transfer',
    type: 'MANUAL',
    runningTotal: goal.currentAmount,
  };
  MOCK_CONTRIBUTIONS[id] = [newContribution, ...contributions];
  return goal;
}

export async function updateAutoDebit(id: string, config: AutoDebitConfig): Promise<SavingsGoal> {
  await delay(500);
  const goal = MOCK_GOALS.find((g) => g.id === id);
  if (!goal) throw new Error('Goal not found');
  goal.autoDebit = config;
  goal.fundingMethod = 'AUTO_DEBIT';
  return goal;
}

export async function getGoalContributions(id: string): Promise<GoalContribution[]> {
  await delay(300);
  return MOCK_CONTRIBUTIONS[id] || [];
}

export async function getRecurringDeposits(): Promise<RecurringDeposit[]> {
  await delay();
  return [...MOCK_RECURRING_DEPOSITS];
}

export async function getRecurringDepositById(id: string): Promise<RecurringDeposit | undefined> {
  await delay(300);
  return MOCK_RECURRING_DEPOSITS.find((rd) => rd.id === id);
}
