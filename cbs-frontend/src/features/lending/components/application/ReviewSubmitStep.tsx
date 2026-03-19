import { InfoGrid } from '@/components/shared';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';
import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { useSubmitLoanApplication } from '../../hooks/useLoanData';

interface Props {
  state: LoanApplicationState;
  goToStep: (step: number) => void;
}

export function ReviewSubmitStep({ state, goToStep }: Props) {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [applicationRef, setApplicationRef] = useState('');

  const submitMutation = useSubmitLoanApplication();
  const submitting = submitMutation.isPending;

  const handleSubmit = async () => {
    submitMutation.mutate(
      {
        productCode: state.productCode,
        amount: state.amount,
        purpose: state.purpose,
        tenorMonths: state.tenorMonths,
        interestRate: state.interestRate,
        repaymentMethod: state.repaymentMethod,
        monthlyIncome: state.monthlyIncome,
        monthlyExpenses: state.monthlyExpenses,
      } as any,
      {
        onSuccess: (application) => {
          setApplicationRef(application.applicationNumber ?? '');
          setSubmitted(true);
          toast.success('Loan application submitted successfully');
        },
        onError: () => {
          toast.error('Failed to submit loan application. Please try again.');
        },
      },
    );
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold">Application Submitted</h3>
        <p className="text-muted-foreground">Reference: <span className="font-mono font-medium">{applicationRef}</span></p>
        <p className="text-sm text-muted-foreground">Your application has been routed to {state.approvalLevel} for approval.</p>
        <button onClick={() => navigate('/lending/applications')} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">View Applications</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Review & Submit</h3>

      {/* Loan Details */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <span className="text-sm font-semibold">Loan Details</span>
          <button onClick={() => goToStep(2)} className="text-xs text-primary hover:underline">Edit</button>
        </div>
        <div className="p-5">
          <InfoGrid columns={3} items={[
            { label: 'Product', value: state.productCode },
            { label: 'Amount', value: state.amount, format: 'money' },
            { label: 'Purpose', value: state.purpose || '—' },
            { label: 'Tenor', value: `${state.tenorMonths} months` },
            { label: 'Interest Rate', value: `${state.interestRate}% p.a.` },
            { label: 'Method', value: state.repaymentMethod.replace(/_/g, ' ') },
          ]} />
        </div>
      </div>

      {/* Financial */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <span className="text-sm font-semibold">Financial Assessment</span>
          <button onClick={() => goToStep(3)} className="text-xs text-primary hover:underline">Edit</button>
        </div>
        <div className="p-5">
          <InfoGrid columns={3} items={[
            { label: 'Monthly Income', value: state.monthlyIncome, format: 'money' },
            { label: 'Monthly Expenses', value: state.monthlyExpenses, format: 'money' },
            { label: 'DTI Ratio', value: `${state.debtToIncomeRatio.toFixed(1)}%`, mono: true },
          ]} />
        </div>
      </div>

      {/* Approval */}
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm"><span className="text-muted-foreground">Approval Authority:</span> <span className="font-medium">{state.approvalLevel}</span></div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Application'}
      </button>
    </div>
  );
}
