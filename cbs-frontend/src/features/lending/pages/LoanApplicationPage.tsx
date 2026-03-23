import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLoanApplication } from '../hooks/useLoanApplication';
import { LoanTypeStep } from '../components/application/LoanTypeStep';
import { CustomerStep } from '../components/application/CustomerStep';
import { LoanDetailsStep } from '../components/application/LoanDetailsStep';
import { FinancialAssessmentStep } from '../components/application/FinancialAssessmentStep';
import { CollateralStep } from '../components/application/CollateralStep';
import { DocumentsStep } from '../components/application/DocumentsStep';
import { CreditScoreStep } from '../components/application/CreditScoreStep';
import { ApprovalStep } from '../components/application/ApprovalStep';
import { SchedulePreviewStep } from '../components/application/SchedulePreviewStep';
import { ReviewSubmitStep } from '../components/application/ReviewSubmitStep';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  'Loan Type', 'Customer', 'Details', 'Financial', 'Collateral',
  'Documents', 'Credit Score', 'Schedule', 'Approval', 'Review',
];

export function LoanApplicationPage() {
  const [searchParams] = useSearchParams();
  const { state, updateField, nextStep, prevStep, goToStep } = useLoanApplication();
  const prefilledCustomerId = Number(searchParams.get('customerId'));
  const prefilledCustomerName = searchParams.get('customerName') ?? '';

  useEffect(() => {
    if (Number.isFinite(prefilledCustomerId) && prefilledCustomerId > 0 && state.customerId !== prefilledCustomerId) {
      updateField('customerId', prefilledCustomerId);
    }
    if (prefilledCustomerName && state.customerName !== prefilledCustomerName) {
      updateField('customerName', prefilledCustomerName);
    }
  }, [prefilledCustomerId, prefilledCustomerName, state.customerId, state.customerName, updateField]);

  const renderStep = () => {
    switch (state.step) {
      case 0: return <LoanTypeStep state={state} updateField={updateField} onNext={nextStep} />;
      case 1: return <CustomerStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 2: return <LoanDetailsStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 3: return <FinancialAssessmentStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 4: return <CollateralStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 5: return <DocumentsStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 6: return <CreditScoreStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 7: return <SchedulePreviewStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 8: return <ApprovalStep state={state} updateField={updateField} onNext={nextStep} onBack={prevStep} />;
      case 9: return <ReviewSubmitStep state={state} goToStep={goToStep} />;
      default: return <PlaceholderStep step={state.step} stepName={STEPS[state.step]} onNext={nextStep} onBack={prevStep} />;
    }
  };

  return (
    <>
      <PageHeader title="New Loan Application" subtitle="Complete all steps to submit the application" backTo="/lending/applications" />
      <div className="page-container">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, i) => (
              <button
                key={step}
                onClick={() => i < state.step && goToStep(i)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium transition-colors',
                  i === state.step ? 'text-primary' : i < state.step ? 'text-green-600 cursor-pointer hover:text-green-700' : 'text-muted-foreground',
                )}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
                  i === state.step ? 'border-primary bg-primary text-primary-foreground' :
                  i < state.step ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground/30 text-muted-foreground',
                )}>
                  {i < state.step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="hidden lg:inline">{step}</span>
              </button>
            ))}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((state.step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {renderStep()}
      </div>
    </>
  );
}

function PlaceholderStep({ step, stepName, onNext, onBack }: { step: number; stepName: string; onNext: () => void; onBack: () => void }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">Step {step + 1}: {stepName}</h3>
      <p className="text-sm text-muted-foreground mb-6">This step will be fully implemented with form fields and validation.</p>
      <div className="flex gap-3 justify-center">
        {step > 0 && <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>}
        <button onClick={onNext} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Continue</button>
      </div>
    </div>
  );
}
