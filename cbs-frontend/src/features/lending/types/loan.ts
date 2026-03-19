import type { Auditable } from '@/types/common';

export interface LoanProduct {
  id: number;
  productCode: string;
  productName: string;
  productType: 'PERSONAL' | 'SME_WORKING_CAPITAL' | 'SME_ASSET' | 'MORTGAGE' | 'OVERDRAFT' | 'POS_LOAN';
  minAmount: number;
  maxAmount: number;
  minTenorMonths: number;
  maxTenorMonths: number;
  interestRateMin: number;
  interestRateMax: number;
  requiresCollateral: boolean;
  description?: string;
}

export interface LoanApplication extends Auditable {
  id: number;
  applicationRef: string;
  customerId: number;
  customerName: string;
  productCode: string;
  productName: string;
  requestedAmount: number;
  approvedAmount?: number;
  submittedDate?: string;
  interestRate: number;
  tenorMonths: number;
  purpose: string;
  repaymentMethod: 'EQUAL_INSTALLMENT' | 'REDUCING_BALANCE' | 'FLAT_RATE' | 'BALLOON';
  repaymentFrequency: 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY' | 'BULLET';
  monthlyIncome: number;
  monthlyExpenses: number;
  debtToIncomeRatio: number;
  creditScore?: number;
  creditRating?: string;
  scoringDecision?: 'APPROVE' | 'REFER' | 'DECLINE';
  status: 'DRAFT' | 'SUBMITTED' | 'SCORING' | 'PENDING_APPROVAL' | 'APPROVED' | 'DISBURSEMENT_PENDING' | 'DISBURSED' | 'REJECTED' | 'CANCELLED';
  approvalLevel?: string;
  officerNotes?: string;
  rejectionReason?: string;
}

export interface LoanAccount extends Auditable {
  id: number;
  loanNumber: string;
  applicationId: number;
  customerId: number;
  customerName: string;
  productCode: string;
  productName: string;
  disbursedAmount: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  totalOutstanding: number;
  interestRate: number;
  tenorMonths: number;
  remainingMonths: number;
  monthlyPayment: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  daysPastDue: number;
  classification: 'CURRENT' | 'WATCH' | 'SUBSTANDARD' | 'DOUBTFUL' | 'LOST';
  provisionAmount: number;
  currency: string;
  disbursedDate: string;
  maturityDate: string;
  lastPaymentDate?: string;
  restructureCount: number;
  assignedOfficer?: string;
  status: 'ACTIVE' | 'ARREARS' | 'DEFAULT' | 'RESTRUCTURED' | 'SETTLED' | 'WRITTEN_OFF';
}

export interface RepaymentScheduleItem {
  installmentNumber: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  outstanding: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'DUE' | 'OVERDUE' | 'FUTURE';
  paidDate?: string;
  daysOverdue?: number;
}

export interface LoanPayment {
  id: number;
  paymentRef: string;
  loanNumber: string;
  paymentDate: string;
  paidDate?: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  penaltyPortion: number;
  channel: string;
  source?: string;
  type?: string;
  status: 'COMPLETED' | 'REVERSED' | 'PENDING';
}

export interface CollateralItem {
  id: number;
  type: 'PROPERTY' | 'VEHICLE' | 'EQUIPMENT' | 'CASH_DEPOSIT' | 'SHARES' | 'INSURANCE_POLICY';
  description: string;
  estimatedValue: number;
  forcedSaleValue?: number;
  location?: string;
  ownershipProofRef?: string;
}

export interface PortfolioStats {
  totalOutstanding: number;
  activeLoansCount: number;
  activeLoans: number;
  activeLoansChange?: number;
  nplRatio: number;
  disbursedMtd: number;
  collectionsMtd: number;
  dpdDistribution: { bucket: string; count: number; amount: number }[];
  classificationBreakdown: { classification: string; count: number; amount: number }[];
  sectorConcentration: { sector: string; amount: number; pct: number }[];
}

export interface SettlementCalculation {
  outstandingPrincipal: number;
  accruedInterest: number;
  earlySettlementPenalty: number;
  totalSettlementAmount: number;
  savingsVsFullTerm: number;
}

export interface LoanFilters {
  status?: string;
  classification?: string;
  productCode?: string;
  officerId?: string;
  minDpd?: number;
  search?: string;
  page?: number;
  size?: number;
  fromDate?: string;
  toDate?: string;
  [key: string]: unknown;
}
