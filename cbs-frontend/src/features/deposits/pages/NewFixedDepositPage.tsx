import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { MoneyInput, FormSection } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fixedDepositApi, type RateTable, type MaturityInstruction } from '../api/fixedDepositApi';
import { FdRateTable } from '../components/FdRateTable';
import { FdCalculator } from '../components/FdCalculator';
import { FdMaturityInstruction } from '../components/FdMaturityInstruction';

const STEPS = [
  { number: 1, label: 'Customer & Account' },
  { number: 2, label: 'Tenor & Rate' },
  { number: 3, label: 'Amount' },
  { number: 4, label: 'Maturity Instruction' },
  { number: 5, label: 'Review & Submit' },
];

interface FormState {
  customerId: string;
  customerName: string;
  sourceAccountId: string;
  sourceAccountNumber: string;
  selectedRate: RateTable | null;
  rateType: 'standard' | 'premium';
  principalAmount: number;
  currency: string;
  maturityInstruction: MaturityInstruction;
}

const INITIAL_STATE: FormState = {
  customerId: '',
  customerName: '',
  sourceAccountId: '',
  sourceAccountNumber: '',
  selectedRate: null,
  rateType: 'standard',
  principalAmount: 0,
  currency: 'NGN',
  maturityInstruction: { type: 'ROLLOVER_ALL' },
};

// Mock accounts for demo purposes
const MOCK_SOURCE_ACCOUNTS = [
  { id: 'acc-001', number: '0012345678', title: 'Chukwuemeka Obi - Savings' },
  { id: 'acc-002', number: '0023456789', title: 'Adaeze Nwosu - Current' },
  { id: 'acc-003', number: '0034567890', title: 'Emeka Eze - Savings' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center min-w-0">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all',
                currentStep > step.number
                  ? 'bg-primary text-primary-foreground'
                  : currentStep === step.number
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
            </div>
            <span
              className={cn(
                'text-xs mt-1 text-center whitespace-nowrap',
                currentStep === step.number ? 'text-primary font-medium' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'h-px w-8 sm:w-16 mx-1 flex-shrink-0 mt-[-16px]',
                currentStep > step.number + 1
                  ? 'bg-primary'
                  : currentStep > step.number
                  ? 'bg-primary'
                  : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function NewFixedDepositPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [createdFdNumber, setCreatedFdNumber] = useState<string | null>(null);

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['fixed-deposits', 'rates'],
    queryFn: () => fixedDepositApi.getRateTables(),
    staleTime: 300_000,
  });

  const { mutate: createFd, isPending } = useMutation({
    mutationFn: () =>
      fixedDepositApi.createFixedDeposit({
        customerId: form.customerId,
        sourceAccountId: form.sourceAccountId,
        principalAmount: form.principalAmount,
        currency: form.currency,
        tenor: form.selectedRate!.tenor,
        rate: form.rateType === 'standard' ? form.selectedRate!.standardRate : form.selectedRate!.premiumRate,
        maturityInstruction: form.maturityInstruction,
      }),
    onSuccess: (fd) => {
      setCreatedFdNumber(fd.fdNumber);
      setStep(6);
      toast.success(`Fixed deposit ${fd.fdNumber} created successfully`);
    },
    onError: () => {
      toast.error('Failed to create fixed deposit. Please try again.');
    },
  });

  const selectedRateValue = form.selectedRate
    ? (form.rateType === 'standard' ? form.selectedRate.standardRate : form.selectedRate.premiumRate)
    : 0;

  const canProceedStep1 = form.customerName.trim().length > 0 && form.sourceAccountNumber.trim().length > 0;
  const canProceedStep2 = form.selectedRate !== null;
  const canProceedStep3 = form.principalAmount >= 1000;

  function handleNext() {
    if (step < 5) setStep((s) => s + 1);
    else createFd();
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  const canProceed = step === 1 ? canProceedStep1 : step === 2 ? canProceedStep2 : step === 3 ? canProceedStep3 : true;

  // Success screen
  if (step === 6 && createdFdNumber) {
    return (
      <>
        <PageHeader title="New Fixed Deposit" backTo="/accounts/fixed-deposits" />
        <div className="page-container flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Fixed Deposit Created</h2>
            <p className="text-muted-foreground mt-1">Your fixed deposit has been placed successfully.</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-8 py-4">
            <p className="text-sm text-muted-foreground">FD Certificate Number</p>
            <p className="text-2xl font-mono font-bold mt-1">{createdFdNumber}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/accounts/fixed-deposits')}
              className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Back to Fixed Deposits
            </button>
            <button
              onClick={() => {
                setStep(1);
                setForm(INITIAL_STATE);
                setCreatedFdNumber(null);
              }}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Place Another FD
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New Fixed Deposit"
        subtitle="Place a new term deposit for a customer"
        backTo="/accounts/fixed-deposits"
      />

      <div className="page-container max-w-3xl space-y-6">
        {/* Stepper */}
        <div className="rounded-lg border bg-card px-6 py-5">
          <StepIndicator currentStep={step} />
        </div>

        {/* Step 1: Customer & Account */}
        {step === 1 && (
          <FormSection title="Customer & Source Account" description="Search for the customer and select their source account">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Customer Name</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value, customerId: `cust-${Date.now()}` }))}
                  placeholder="Enter customer name..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Source Account Number</label>
                <input
                  type="text"
                  value={form.sourceAccountNumber}
                  onChange={(e) => {
                    const num = e.target.value;
                    const matched = MOCK_SOURCE_ACCOUNTS.find((a) => a.number === num);
                    setForm((f) => ({
                      ...f,
                      sourceAccountNumber: num,
                      sourceAccountId: matched?.id ?? `acc-${Date.now()}`,
                      customerName: matched ? matched.title.split(' - ')[0] : f.customerName,
                      customerId: matched ? matched.id : f.customerId,
                    }));
                  }}
                  placeholder="Enter 10-digit account number..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={10}
                />
                {MOCK_SOURCE_ACCOUNTS.filter((a) => form.sourceAccountNumber.length >= 4 && a.number.startsWith(form.sourceAccountNumber)).map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setForm((f) => ({
                      ...f,
                      sourceAccountId: acc.id,
                      sourceAccountNumber: acc.number,
                      customerName: acc.title.split(' - ')[0],
                      customerId: acc.id,
                    }))}
                    className="w-full mt-1 rounded-lg border px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-mono">{acc.number}</span> — {acc.title}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
            </div>
          </FormSection>
        )}

        {/* Step 2: Tenor & Rate */}
        {step === 2 && (
          <FormSection title="Select Tenor & Rate" description="Choose the deposit tenor and applicable rate type">
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, rateType: 'standard' }))}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                    form.rateType === 'standard' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50',
                  )}
                >
                  Standard Rate
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, rateType: 'premium' }))}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                    form.rateType === 'premium' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50',
                  )}
                >
                  Premium Rate
                </button>
              </div>
              {ratesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <FdRateTable
                  rates={rates}
                  selectedTenor={form.selectedRate?.tenor}
                  onSelect={(rate) => setForm((f) => ({ ...f, selectedRate: rate }))}
                />
              )}
              {form.selectedRate && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                  Selected: <span className="font-semibold">{form.selectedRate.tenorLabel}</span> at{' '}
                  <span className="font-semibold">
                    {formatPercent(form.rateType === 'standard' ? form.selectedRate.standardRate : form.selectedRate.premiumRate)} p.a.
                  </span>{' '}
                  ({form.rateType} rate)
                </div>
              )}
            </div>
          </FormSection>
        )}

        {/* Step 3: Amount */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormSection title="Principal Amount" description="Enter the amount to be deposited">
              <div className="space-y-4">
                <MoneyInput
                  label="Principal Amount"
                  value={form.principalAmount}
                  onChange={(v) => setForm((f) => ({ ...f, principalAmount: v }))}
                  currency={form.currency}
                  min={1000}
                />
                {form.principalAmount > 0 && form.principalAmount < 1000 && (
                  <p className="text-xs text-red-500">Minimum deposit amount is {formatMoney(1000, form.currency)}</p>
                )}
              </div>
            </FormSection>

            {form.selectedRate && (
              <FdCalculator
                principal={form.principalAmount}
                rate={selectedRateValue}
                tenor={form.selectedRate.tenor}
              />
            )}
          </div>
        )}

        {/* Step 4: Maturity Instruction */}
        {step === 4 && (
          <FormSection title="Maturity Instruction" description="Choose what happens when the FD matures">
            <FdMaturityInstruction
              value={form.maturityInstruction}
              onChange={(v) => setForm((f) => ({ ...f, maturityInstruction: v }))}
              accounts={MOCK_SOURCE_ACCOUNTS}
            />
          </FormSection>
        )}

        {/* Step 5: Review */}
        {step === 5 && form.selectedRate && (
          <FormSection title="Review Details" description="Please review all details before submitting">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <ReviewRow label="Customer" value={form.customerName} />
                <ReviewRow label="Source Account" value={form.sourceAccountNumber} mono />
                <ReviewRow label="Currency" value={form.currency} />
                <ReviewRow label="Principal" value={formatMoney(form.principalAmount, form.currency)} mono />
                <ReviewRow label="Tenor" value={`${form.selectedRate.tenor} days (${form.selectedRate.tenorLabel})`} />
                <ReviewRow label="Rate" value={`${formatPercent(selectedRateValue)} p.a. (${form.rateType})`} mono />
                <ReviewRow label="Maturity Instruction" value={INSTRUCTION_LABEL_MAP[form.maturityInstruction.type]} />
                {form.maturityInstruction.destinationAccountId && (
                  <ReviewRow label="Destination Account" value={form.maturityInstruction.destinationAccountId} mono />
                )}
              </div>

              <div className="mt-4">
                <FdCalculator
                  principal={form.principalAmount}
                  rate={selectedRateValue}
                  tenor={form.selectedRate.tenor}
                />
              </div>
            </div>
          </FormSection>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed || isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 5 ? 'Create Fixed Deposit' : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

const INSTRUCTION_LABEL_MAP: Record<string, string> = {
  ROLLOVER_ALL: 'Auto-Rollover (Principal + Interest)',
  ROLLOVER_PRINCIPAL: 'Auto-Rollover (Principal Only)',
  LIQUIDATE: 'Liquidate to Account',
  MANUAL: 'Manual Decision at Maturity',
};

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <div className="text-muted-foreground">{label}</div>
      <div className={cn('font-medium', mono && 'font-mono')}>{value}</div>
    </>
  );
}
