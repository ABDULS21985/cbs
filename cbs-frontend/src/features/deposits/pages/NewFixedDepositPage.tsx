import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  fixedDepositApi,
  type InterestCalcResult,
  type MaturityInstruction,
  type RateTable,
} from '../api/fixedDepositApi';
import { FdCalculator } from '../components/FdCalculator';
import { FdMaturityInstruction } from '../components/FdMaturityInstruction';
import {
  useCalculateInterest,
  useCreateFixedDeposit,
  useCustomerAccounts,
  useCustomerSearch,
  type CustomerAccount,
  type CustomerSummary,
} from '../hooks/useFixedDeposits';

const STEPS = [
  { number: 1, label: 'Customer', description: 'Search and fund' },
  { number: 2, label: 'Pricing', description: 'Rate and tenor' },
  { number: 3, label: 'Amount', description: 'Principal setup' },
  { number: 4, label: 'Maturity', description: 'Instruction path' },
  { number: 5, label: 'Review', description: 'Final confirmation' },
];

interface FormState {
  customerId: number;
  customerName: string;
  sourceAccountId: number;
  sourceAccountNumber: string;
  sourceBalance: number;
  selectedRate: RateTable | null;
  customTenor: number;
  rateType: 'standard' | 'premium';
  principalAmount: number;
  currency: string;
  maturityInstruction: MaturityInstruction;
}

const INITIAL: FormState = {
  customerId: 0,
  customerName: '',
  sourceAccountId: 0,
  sourceAccountNumber: '',
  sourceBalance: 0,
  selectedRate: null,
  customTenor: 0,
  rateType: 'standard',
  principalAmount: 0,
  currency: 'NGN',
  maturityInstruction: { type: 'ROLLOVER_ALL' },
};

const LABELS: Record<string, string> = {
  ROLLOVER_ALL: 'Auto-Rollover (Principal + Interest)',
  ROLLOVER_PRINCIPAL: 'Auto-Rollover (Principal Only)',
  LIQUIDATE: 'Liquidate to Account',
  MANUAL: 'Manual Decision at Maturity',
};

function estimateResult(principal: number, rate: number, tenor: number): InterestCalcResult | null {
  if (principal <= 0 || rate <= 0 || tenor <= 0) {
    return null;
  }

  const grossInterest = principal * (rate / 100) * (tenor / 365);
  const wht = grossInterest * 0.10;
  const netInterest = grossInterest - wht;
  const maturityValue = principal + netInterest;

  return {
    principal,
    rate,
    tenor,
    grossInterest,
    wht,
    netInterest,
    maturityValue,
  };
}

function isLiquidationReady(instruction: MaturityInstruction): boolean {
  if (instruction.type !== 'LIQUIDATE') {
    return true;
  }

  return instruction.destinationAccountId !== undefined
    && String(instruction.destinationAccountId).trim().length > 0;
}

function Stepper({ currentStep }: { currentStep: number }) {
  const totalSteps = STEPS.length;
  const progress = totalSteps > 1 ? Math.round(((currentStep - 1) / (totalSteps - 1)) * 100) : 0;

  return (
    <div className="opening-stepper-shell space-y-5" role="navigation" aria-label="Fixed deposit origination progress">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Origination Map</p>
          <h2 className="mt-2 text-base font-semibold">Fixed Deposit Placement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track funding, pricing, amount validation, and final placement.</p>
        </div>
        <div className="opening-hero-chip font-mono">{currentStep}/{totalSteps}</div>
      </div>

      <div className="space-y-2">
        <div
          className="opening-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progress}% complete`}
        >
          <div className="opening-progress-fill transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}% complete</span>
          <span>Step {currentStep} of {totalSteps}</span>
        </div>
      </div>

      <div className="hidden lg:grid gap-2">
        {STEPS.map((step) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div
              key={step.number}
              className={cn(
                'opening-stepper-item',
                isDone && 'opening-stepper-item-complete',
                isCurrent && 'opening-stepper-item-active',
                !isDone && !isCurrent && 'opening-stepper-item-upcoming',
              )}
            >
              <div
                className={cn(
                  'opening-stepper-index',
                  isDone && 'border-emerald-500/20 bg-emerald-500/12 text-emerald-600',
                  isCurrent && 'border-primary/30 bg-primary/10 text-primary',
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.number}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className={cn('text-sm font-semibold', isCurrent && 'text-primary')}>{step.label}</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                      isDone && 'bg-emerald-500/12 text-emerald-600',
                      isCurrent && 'bg-primary/12 text-primary',
                      !isDone && !isCurrent && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isDone ? 'Complete' : isCurrent ? 'In progress' : 'Queued'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lg:hidden rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {currentStep}
          </div>
          <div>
            <p className="text-sm font-semibold">{STEPS[currentStep - 1].label}</p>
            <p className="text-xs text-muted-foreground">{STEPS[currentStep - 1].description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <div className="opening-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="opening-hero-chip h-11 w-11 justify-center rounded-2xl p-0 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-sm font-semibold', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

export function NewFixedDepositPage() {
  useEffect(() => {
    document.title = 'New Fixed Deposit | CBS';
  }, []);

  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [createdFdNumber, setCreatedFdNumber] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [serverCalc, setServerCalc] = useState<InterestCalcResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const calcTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  const { data: customerResults = [], isFetching: searchingCustomers } = useCustomerSearch(debouncedSearch);
  const { data: customerAccounts = [], isLoading: accountsLoading } = useCustomerAccounts(form.customerId);
  const activeAccounts = customerAccounts.filter((account: CustomerAccount) => account.status === 'ACTIVE');

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['fixed-deposits', 'rates'],
    queryFn: () => fixedDepositApi.getRateTables(),
    staleTime: 300_000,
  });

  const calcMutation = useCalculateInterest();
  const createFd = useCreateFixedDeposit();

  const selectedRateValue = form.selectedRate
    ? (form.rateType === 'standard' ? form.selectedRate.standardRate : form.selectedRate.premiumRate)
    : 0;
  const effectiveTenor = form.customTenor > 0 ? form.customTenor : (form.selectedRate?.tenor ?? 0);
  const estimatedResult = estimateResult(form.principalAmount, selectedRateValue, effectiveTenor);
  const calcResult = serverCalc ?? estimatedResult;
  const selectedTenorLabel = form.selectedRate
    ? form.customTenor > 0
      ? `${form.customTenor} days override`
      : form.selectedRate.tenorLabel
    : 'Pending';
  const completedSteps = STEPS.filter((item) => item.number < step).length;
  const progress = STEPS.length > 1 ? Math.round(((step - 1) / (STEPS.length - 1)) * 100) : 0;
  const hasBalanceWarning = form.principalAmount > form.sourceBalance && form.sourceBalance > 0;
  const hasLargePlacementWarning = form.principalAmount > 0
    && form.sourceBalance > 0
    && form.principalAmount > form.sourceBalance * 0.5
    && form.principalAmount <= form.sourceBalance;

  useEffect(() => {
    if (form.principalAmount > 0 && selectedRateValue > 0 && effectiveTenor > 0) {
      clearTimeout(calcTimer.current);
      calcTimer.current = setTimeout(() => {
        calcMutation.mutate(
          { principal: form.principalAmount, rate: selectedRateValue, tenor: effectiveTenor },
          {
            onSuccess: (result) => setServerCalc(result),
            onError: () => setServerCalc(null),
          },
        );
      }, 500);
    } else {
      setServerCalc(null);
    }

    return () => clearTimeout(calcTimer.current);
  }, [calcMutation, effectiveTenor, form.principalAmount, selectedRateValue]);

  function selectCustomer(customer: CustomerSummary) {
    setForm((current) => ({
      ...current,
      customerId: customer.id,
      customerName: customer.fullName,
      sourceAccountId: 0,
      sourceAccountNumber: '',
      sourceBalance: 0,
      currency: 'NGN',
    }));
    setSearchQuery(customer.fullName);
    setShowDropdown(false);
  }

  function selectAccount(account: CustomerAccount) {
    setForm((current) => ({
      ...current,
      sourceAccountId: account.id,
      sourceAccountNumber: account.accountNumber,
      sourceBalance: account.availableBalance,
      currency: account.currency,
      maturityInstruction:
        current.maturityInstruction.type === 'LIQUIDATE'
          && String(current.maturityInstruction.destinationAccountId ?? '') === String(current.sourceAccountId)
          ? { type: 'LIQUIDATE' }
          : current.maturityInstruction,
    }));
  }

  function resetFlow() {
    setStep(1);
    setForm(INITIAL);
    setCreatedFdNumber(null);
    setSearchQuery('');
    setDebouncedSearch('');
    setShowDropdown(false);
    setServerCalc(null);
  }

  const canProceedStep1 = form.customerId > 0 && form.sourceAccountId > 0;
  const canProceedStep2 = form.selectedRate !== null;
  const canProceedStep3 = form.principalAmount >= 1000 && (form.sourceBalance <= 0 || form.principalAmount <= form.sourceBalance);
  const canProceedStep4 = isLiquidationReady(form.maturityInstruction);
  const canProceed = step === 1
    ? canProceedStep1
    : step === 2
      ? canProceedStep2
      : step === 3
        ? canProceedStep3
        : step === 4
          ? canProceedStep4
          : true;

  function handleNext() {
    if (step < 5) {
      setStep((current) => current + 1);
      return;
    }

    createFd.mutate(
      {
        customerId: String(form.customerId),
        sourceAccountId: String(form.sourceAccountId),
        principalAmount: form.principalAmount,
        currency: form.currency,
        tenor: effectiveTenor,
        rate: selectedRateValue,
        maturityInstruction: form.maturityInstruction,
      },
      {
        onSuccess: (fd) => {
          setCreatedFdNumber(fd.fdNumber);
          setStep(6);
          toast.success(`Fixed deposit ${fd.fdNumber} created`);
        },
        onError: () => toast.error('Failed to create fixed deposit'),
      },
    );
  }

  if (step === 6 && createdFdNumber) {
    return (
      <div className="page-container space-y-6">
        <section className="opening-hero-shell">
          <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="opening-hero-chip">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Fixed deposit placed
                </div>
                <div className="opening-hero-chip">
                  {selectedTenorLabel}
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Fixed deposit created</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  The term deposit has been placed successfully and is now available for certificate generation, maturity tracking, and operations follow-up.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryMetric
                  label="FD Number"
                  value={createdFdNumber}
                  helper="Reference for servicing and certificate retrieval"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <SummaryMetric
                  label="Principal"
                  value={formatMoney(form.principalAmount, form.currency)}
                  helper="Booked amount"
                  icon={<Wallet className="h-5 w-5" />}
                />
                <SummaryMetric
                  label="Projected Maturity"
                  value={formatMoney(calcResult?.maturityValue ?? form.principalAmount, form.currency)}
                  helper="Latest calculated maturity value"
                  icon={<CircleDollarSign className="h-5 w-5" />}
                />
              </div>
            </div>

            <div className="grid gap-4 self-start">
              <div className="opening-section-card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Placement Snapshot</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-semibold">{form.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Funding account</span>
                    <span className="font-mono font-semibold">{form.sourceAccountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Maturity path</span>
                    <span className="font-semibold">{LABELS[form.maturityInstruction.type]}</span>
                  </div>
                </div>
              </div>

              <div className="opening-section-card p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Next Actions</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/accounts/fixed-deposits/${createdFdNumber}`)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    View Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/accounts/fixed-deposits')}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/70"
                  >
                    Back to Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/70"
                  >
                    Place Another FD
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <section className="opening-hero-shell">
        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => navigate('/accounts/fixed-deposits')} className="opening-hero-chip" aria-label="Back to fixed deposits">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="opening-hero-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Term deposit origination
              </div>
              <div className="opening-hero-chip">
                {form.currency} placement
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Place New Fixed Deposit</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Search the customer, fund the placement from a live account, apply the correct rate band, and submit the fixed deposit through one guided flow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryMetric
                label="Current Step"
                value={STEPS[step - 1].label}
                helper={`Step ${step} of ${STEPS.length}`}
                icon={<Sparkles className="h-5 w-5" />}
              />
              <SummaryMetric
                label="Pricing Band"
                value={selectedTenorLabel}
                helper={form.selectedRate ? `${formatPercent(selectedRateValue)} p.a. (${form.rateType})` : 'Choose a rate card to continue'}
                icon={<CalendarDays className="h-5 w-5" />}
              />
              <SummaryMetric
                label="Projected Value"
                value={calcResult ? formatMoney(calcResult.maturityValue, form.currency) : 'Pending'}
                helper="Updates after amount, rate, and tenor are set"
                icon={<CircleDollarSign className="h-5 w-5" />}
              />
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="opening-section-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Flow Status</p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4 text-primary" /> Funding account
                  </span>
                  <span className="text-sm font-semibold">{form.sourceAccountNumber || 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Rate selection
                  </span>
                  <span className="text-sm font-semibold">{form.selectedRate ? 'Selected' : 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Landmark className="h-4 w-4 text-primary" /> Maturity instruction
                  </span>
                  <span className="text-sm font-semibold">{LABELS[form.maturityInstruction.type]}</span>
                </div>
              </div>
            </div>

            <div className="opening-section-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Progress Snapshot</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold">{progress}%</p>
                  <p className="text-sm text-muted-foreground">{completedSteps} step(s) completed</p>
                </div>
                {searchingCustomers && step === 1 ? (
                  <div className="opening-hero-chip">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 self-start xl:sticky xl:top-6">
          <Stepper currentStep={step} />
          <div className="opening-sidebar-shell p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Operating Context</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Customer</p>
                <p className="mt-2 text-sm font-semibold">{form.customerName || 'Not selected'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Funding Account</p>
                <p className="mt-2 text-sm font-semibold">{form.sourceAccountNumber || 'Awaiting selection'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Principal</p>
                <p className="mt-2 text-sm font-semibold">{form.principalAmount > 0 ? formatMoney(form.principalAmount, form.currency) : 'Pending'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Maturity Path</p>
                <p className="mt-2 text-sm font-semibold">{LABELS[form.maturityInstruction.type]}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="opening-workspace-shell">
          <div className="opening-step-banner">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Fixed Deposit Wizard</p>
                <h2 className="mt-2 text-xl font-semibold">{STEPS[step - 1].label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{STEPS[step - 1].description}</p>
              </div>
              <div className="opening-hero-chip">
                Step {step} of {STEPS.length}
              </div>
            </div>
          </div>

          <div className="opening-content-shell space-y-6">
            {step === 1 ? (
              <section className="opening-section-card space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">1. Customer & Funding</p>
                  <h3 className="mt-2 text-lg font-semibold">Search customer and choose the funding account</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the live customer search, then pick the account that will fund the term deposit placement.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="fd-customer-search" className="text-sm font-medium">Customer Search</label>
                  <div className="relative">
                    <div className="opening-search-shell">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="fd-customer-search"
                        type="text"
                        value={searchQuery}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSearchQuery(value);
                          setShowDropdown(true);
                          if (!value) {
                            setForm((current) => ({
                              ...current,
                              customerId: 0,
                              customerName: '',
                              sourceAccountId: 0,
                              sourceAccountNumber: '',
                              sourceBalance: 0,
                              currency: 'NGN',
                            }));
                          }
                        }}
                        onFocus={() => {
                          if (searchQuery.trim().length >= 2) {
                            setShowDropdown(true);
                          }
                        }}
                        placeholder="Search by name or customer number"
                        className="h-12 w-full bg-transparent pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground"
                      />
                      {searchingCustomers ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
                    </div>

                    {showDropdown && debouncedSearch.length >= 2 ? (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                        <div className="opening-search-dropdown z-20">
                          {customerResults.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto p-2">
                              {customerResults.map((customer) => (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() => selectCustomer(customer)}
                                  className="flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted/70"
                                >
                                  <div>
                                    <p className="text-sm font-semibold">{customer.fullName}</p>
                                    <p className="mt-1 text-xs font-mono text-muted-foreground">{customer.customerNumber}</p>
                                  </div>
                                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {customer.type}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">No matching customers found.</div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {form.customerId > 0 ? (
                  <div className="opening-note-card">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Selected Customer</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold">{form.customerName}</p>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        ID {form.customerId}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="opening-note-card">
                    <p className="text-sm text-muted-foreground">Start with a live customer search. Results appear after at least two characters.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Funding Accounts</p>
                      <p className="text-sm text-muted-foreground">Only active customer accounts are shown.</p>
                    </div>
                    {accountsLoading && form.customerId > 0 ? (
                      <div className="opening-hero-chip">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading accounts
                      </div>
                    ) : null}
                  </div>

                  {form.customerId <= 0 ? (
                    <div className="opening-note-card">
                      <p className="text-sm text-muted-foreground">Select a customer before choosing the funding account.</p>
                    </div>
                  ) : activeAccounts.length === 0 && !accountsLoading ? (
                    <div className="opening-note-card opening-note-card-warning">
                      <p className="text-sm font-semibold">No active accounts found</p>
                      <p className="mt-1 text-sm text-muted-foreground">This customer does not have an eligible active account for the placement.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeAccounts.map((account) => {
                        const isSelected = form.sourceAccountId === account.id;

                        return (
                          <button
                            key={account.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => selectAccount(account)}
                            className={cn(
                              'opening-selection-card text-left',
                              isSelected && 'opening-selection-card-active',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-mono text-sm font-semibold">{account.accountNumber}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{account.accountType}</p>
                              </div>
                              {isSelected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Available</p>
                                <p className="mt-1 text-sm font-semibold">{formatMoney(account.availableBalance, account.currency)}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Currency</p>
                                <p className="mt-1 text-sm font-semibold">{account.currency}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="opening-section-card space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">2. Pricing</p>
                  <h3 className="mt-2 text-lg font-semibold">Choose the rate band and tenor</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick a rate table row first. You can then override the tenor days without losing the selected pricing band.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(['standard', 'premium'] as const).map((rateType) => (
                    <button
                      key={rateType}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, rateType }))}
                      className={cn(
                        'opening-selection-card text-left',
                        form.rateType === rateType && 'opening-selection-card-active',
                      )}
                    >
                      <p className="text-sm font-semibold">{rateType === 'standard' ? 'Standard Rate' : 'Premium Rate'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {rateType === 'standard'
                          ? 'Apply the standard board-approved tenor pricing.'
                          : 'Apply the premium tenor pricing where approved.'}
                      </p>
                    </button>
                  ))}
                </div>

                {ratesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {rates.map((rate) => {
                      const isSelected = form.selectedRate?.tenor === rate.tenor;
                      const displayRate = form.rateType === 'standard' ? rate.standardRate : rate.premiumRate;

                      return (
                        <button
                          key={rate.tenor}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setForm((current) => ({ ...current, selectedRate: rate }))}
                          className={cn(
                            'opening-selection-card text-left',
                            isSelected && 'opening-selection-card-active',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold">{rate.tenorLabel}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{rate.tenor} days</p>
                            </div>
                            {isSelected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Selected Rate</p>
                              <p className="mt-1 text-sm font-semibold">{formatPercent(displayRate)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Other Band</p>
                              <p className="mt-1 text-sm font-semibold">
                                {formatPercent(form.rateType === 'standard' ? rate.premiumRate : rate.standardRate)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <label htmlFor="fd-custom-tenor" className="text-sm font-medium">Custom Tenor Override (Days)</label>
                    <input
                      id="fd-custom-tenor"
                      type="number"
                      min={1}
                      value={form.customTenor || ''}
                      onChange={(event) => setForm((current) => ({ ...current, customTenor: Number(event.target.value) || 0 }))}
                      disabled={!form.selectedRate}
                      placeholder="Optional"
                      className="opening-field-input"
                    />
                  </div>
                  <div className={cn('opening-note-card', !form.selectedRate && 'opening-note-card-warning')}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Pricing Summary</p>
                    {form.selectedRate ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Rate band</span>
                          <span className="font-semibold">{form.selectedRate.tenorLabel}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Applied rate</span>
                          <span className="font-semibold">{formatPercent(selectedRateValue)} p.a.</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Effective tenor</span>
                          <span className="font-semibold">{effectiveTenor} days</span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Select a rate band before continuing. The custom tenor only works after a live rate row has been chosen.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="opening-section-card space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">3. Amount</p>
                    <h3 className="mt-2 text-lg font-semibold">Set the principal amount</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter the placement amount and review the immediate balance impact before proceeding.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="fd-principal-amount" className="text-sm font-medium">Principal Amount</label>
                    <div className="opening-search-shell">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        {form.currency}
                      </span>
                      <input
                        id="fd-principal-amount"
                        type="number"
                        min={1000}
                        step={0.01}
                        value={form.principalAmount || ''}
                        onChange={(event) => setForm((current) => ({ ...current, principalAmount: Number(event.target.value) || 0 }))}
                        placeholder="0.00"
                        className="h-12 w-full bg-transparent pl-16 pr-4 text-right text-sm font-mono outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="opening-note-card">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Available Balance</p>
                      <p className="mt-3 text-2xl font-semibold">{formatMoney(form.sourceBalance, form.currency)}</p>
                      <p className="mt-2 text-sm text-muted-foreground">From the selected funding account.</p>
                    </div>
                    <div className="opening-note-card">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Projected Net Interest</p>
                      <p className="mt-3 text-2xl font-semibold">{formatMoney(calcResult?.netInterest ?? 0, form.currency)}</p>
                      <p className="mt-2 text-sm text-muted-foreground">Uses the current rate and tenor selection.</p>
                    </div>
                  </div>

                  {form.principalAmount > 0 && form.principalAmount < 1000 ? (
                    <div className="opening-note-card opening-note-card-warning">
                      <p className="text-sm font-semibold">Minimum placement not met</p>
                      <p className="mt-1 text-sm text-muted-foreground">The minimum fixed deposit placement is {formatMoney(1000, form.currency)}.</p>
                    </div>
                  ) : null}

                  {hasBalanceWarning ? (
                    <div className="opening-note-card opening-note-card-warning">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold">Placement exceeds available balance</p>
                          <p className="mt-1 text-sm text-muted-foreground">Reduce the principal amount or choose another source account.</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {hasLargePlacementWarning ? (
                    <div className="opening-note-card">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Large balance utilization</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            This placement uses more than half of the available source-account balance.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <FdCalculator
                  principal={form.principalAmount}
                  rate={selectedRateValue}
                  tenor={effectiveTenor}
                  serverResult={serverCalc}
                  isCalculating={calcMutation.isPending}
                  currency={form.currency}
                />
              </div>
            ) : null}

            {step === 4 ? (
              <section className="opening-section-card space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">4. Maturity Instruction</p>
                  <h3 className="mt-2 text-lg font-semibold">Define the maturity path</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose how the deposit should be handled at maturity and capture any destination account where required.
                  </p>
                </div>

                <FdMaturityInstruction
                  value={form.maturityInstruction}
                  onChange={(value) => setForm((current) => ({ ...current, maturityInstruction: value }))}
                  accounts={activeAccounts}
                  sourceAccountId={form.sourceAccountId}
                />

                {form.maturityInstruction.type === 'LIQUIDATE' && !canProceedStep4 ? (
                  <div className="opening-note-card opening-note-card-warning">
                    <p className="text-sm font-semibold">Destination account required</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select or enter the destination account before moving to the final review step.
                    </p>
                  </div>
                ) : (
                  <div className="opening-note-card">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Selected Instruction</p>
                    <p className="mt-3 text-sm font-semibold">{LABELS[form.maturityInstruction.type]}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {form.maturityInstruction.type === 'LIQUIDATE' && form.maturityInstruction.destinationAccountId
                        ? `Destination account: ${form.maturityInstruction.destinationAccountId}`
                        : 'This instruction will be included in the create request.'}
                    </p>
                  </div>
                )}
              </section>
            ) : null}

            {step === 5 ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="opening-section-card space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">5. Review</p>
                    <h3 className="mt-2 text-lg font-semibold">Confirm placement details</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review the funding source, pricing choice, amount, and maturity path before the deposit is created.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <ReviewRow label="Customer" value={form.customerName} />
                    <ReviewRow label="Source Account" value={form.sourceAccountNumber} mono />
                    <ReviewRow label="Available Balance" value={formatMoney(form.sourceBalance, form.currency)} mono />
                    <ReviewRow label="Currency" value={form.currency} />
                    <ReviewRow label="Principal" value={formatMoney(form.principalAmount, form.currency)} mono />
                    <ReviewRow label="Tenor" value={`${effectiveTenor} days${form.selectedRate ? ` (${form.selectedRate.tenorLabel})` : ''}`} />
                    <ReviewRow label="Rate" value={`${formatPercent(selectedRateValue)} p.a. (${form.rateType})`} mono />
                    <ReviewRow label="Maturity Instruction" value={LABELS[form.maturityInstruction.type]} />
                    {form.maturityInstruction.destinationAccountId ? (
                      <ReviewRow label="Destination" value={String(form.maturityInstruction.destinationAccountId)} mono />
                    ) : null}
                  </div>
                </section>

                <div className="space-y-4">
                  <FdCalculator
                    principal={form.principalAmount}
                    rate={selectedRateValue}
                    tenor={effectiveTenor}
                    serverResult={serverCalc}
                    isCalculating={calcMutation.isPending}
                    currency={form.currency}
                  />
                  <div className="opening-note-card">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Submission Note</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Creating the deposit sends the selected customer, funding account, rate, tenor, amount, and maturity instruction directly to the live fixed-deposit create endpoint.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-2">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(1, current - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || createFd.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createFd.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === 5 ? 'Create Fixed Deposit' : (
                  <>
                    <span>
                      {step === 1
                        ? 'Continue to Pricing'
                        : step === 2
                          ? 'Continue to Amount'
                          : step === 3
                            ? 'Continue to Maturity'
                            : 'Continue to Review'}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
