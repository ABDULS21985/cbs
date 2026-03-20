export interface AccountSummary {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  availableBalance: number;
  bookBalance: number;
  currency: string;
  status: string;
  lastTransactionDescription: string | null;
  lastTransactionDate: string | null;
  sparkline: number[];
}

export interface FinancialHealthSummary {
  score: number;
  riskLevel: string;
  savingsRate: number;
  factors: Record<string, unknown>;
  insights: Record<string, string>;
}

export interface CategorySpend {
  category: string;
  amountThisMonth: number;
  amountLastMonth: number;
  budgetAmount: number | null;
  color: string;
}

export interface SpendingBreakdown {
  totalThisMonth: number;
  totalLastMonth: number;
  changePercent: number;
  categories: CategorySpend[];
  smartInsights: string[];
}

export interface GoalSummary {
  id: number;
  goalNumber: string;
  goalName: string;
  goalDescription: string | null;
  goalIcon: string | null;
  targetAmount: number;
  targetDate: string | null;
  currentAmount: number;
  progressPercentage: number;
  autoDebitEnabled: boolean;
  autoDebitAmount: number | null;
  autoDebitFrequency: string | null;
  currencyCode: string;
  status: string;
}

export interface UpcomingEvent {
  type: 'SCHEDULED_TRANSFER' | 'BILL_PAYMENT' | 'CARD_PAYMENT' | 'FD_MATURITY';
  title: string;
  description: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'DUE_SOON' | 'OVERDUE';
}

export interface RecentTransaction {
  id: number;
  transactionRef: string;
  accountNumber: string;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  currencyCode: string;
  narration: string;
  status: string;
  createdAt: string;
}

export interface EnhancedDashboard {
  customerId: number;
  cifNumber: string;
  displayName: string;
  totalAccounts: number;
  totalBookBalance: number;
  totalAvailableBalance: number;
  accounts: AccountSummary[];
  financialHealth: FinancialHealthSummary;
  spendingBreakdown: SpendingBreakdown;
  goals: GoalSummary[];
  upcoming: UpcomingEvent[];
  recentActivity: RecentTransaction[];
}
