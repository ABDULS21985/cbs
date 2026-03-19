import { useState, useCallback } from 'react';
import type { LoanProduct, CollateralItem, RepaymentScheduleItem } from '../types/loan';

export interface LoanApplicationState {
  step: number;
  productCode: string;
  product: LoanProduct | null;
  customerId: number | null;
  customerName: string;
  // Loan details
  amount: number;
  purpose: string;
  tenorMonths: number;
  interestRate: number;
  repaymentMethod: string;
  repaymentFrequency: string;
  // Financial
  monthlyIncome: number;
  monthlyExpenses: number;
  existingObligations: number;
  debtToIncomeRatio: number;
  // Collateral
  collateralItems: CollateralItem[];
  totalCollateralValue: number;
  ltvRatio: number;
  // Scoring
  creditScore: number | null;
  creditRating: string | null;
  scoringDecision: string | null;
  // Schedule
  schedulePreview: RepaymentScheduleItem[];
  totalInterest: number;
  totalRepayment: number;
  // Documents
  documents: { name: string; required: boolean; uploaded: boolean; fileRef?: string }[];
  // Approval
  approvalLevel: string;
  officerNotes: string;
}

const INITIAL_STATE: LoanApplicationState = {
  step: 0,
  productCode: '',
  product: null,
  customerId: null,
  customerName: '',
  amount: 0,
  purpose: '',
  tenorMonths: 12,
  interestRate: 0,
  repaymentMethod: 'EQUAL_INSTALLMENT',
  repaymentFrequency: 'MONTHLY',
  monthlyIncome: 0,
  monthlyExpenses: 0,
  existingObligations: 0,
  debtToIncomeRatio: 0,
  collateralItems: [],
  totalCollateralValue: 0,
  ltvRatio: 0,
  creditScore: null,
  creditRating: null,
  scoringDecision: null,
  schedulePreview: [],
  totalInterest: 0,
  totalRepayment: 0,
  documents: [],
  approvalLevel: '',
  officerNotes: '',
};

export function useLoanApplication() {
  const [state, setState] = useState<LoanApplicationState>(INITIAL_STATE);

  const updateField = useCallback(<K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => {
    setState((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-calculate DTI
      if (field === 'monthlyIncome' || field === 'monthlyExpenses' || field === 'existingObligations') {
        const totalDebt = (next.monthlyExpenses || 0) + (next.existingObligations || 0) + (next.amount / Math.max(next.tenorMonths, 1));
        next.debtToIncomeRatio = next.monthlyIncome > 0 ? (totalDebt / next.monthlyIncome) * 100 : 0;
      }
      // Auto-calculate LTV
      if (field === 'collateralItems') {
        const totalVal = (value as CollateralItem[]).reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
        next.totalCollateralValue = totalVal;
        next.ltvRatio = totalVal > 0 ? (next.amount / totalVal) * 100 : 0;
      }
      // Determine approval level
      if (field === 'amount') {
        const amt = value as number;
        if (amt <= 500_000) next.approvalLevel = 'Branch Officer';
        else if (amt <= 5_000_000) next.approvalLevel = 'Branch Manager';
        else if (amt <= 50_000_000) next.approvalLevel = 'Regional Credit Committee';
        else next.approvalLevel = 'Board Credit Committee';
      }
      return next;
    });
  }, []);

  const nextStep = useCallback(() => setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 9) })), []);
  const prevStep = useCallback(() => setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) })), []);
  const goToStep = useCallback((step: number) => setState((prev) => ({ ...prev, step })), []);
  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, updateField, nextStep, prevStep, goToStep, reset };
}
