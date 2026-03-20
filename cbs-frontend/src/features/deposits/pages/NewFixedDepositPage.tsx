import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Loader2, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { MoneyInput, FormSection } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { fixedDepositApi, type RateTable, type MaturityInstruction, type InterestCalcResult } from '../api/fixedDepositApi';
import { useCustomerSearch, useCustomerAccounts, useCalculateInterest, useCreateFixedDeposit, type CustomerSummary, type CustomerAccount } from '../hooks/useFixedDeposits';
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
  customerId: 0, customerName: '', sourceAccountId: 0, sourceAccountNumber: '', sourceBalance: 0,
  selectedRate: null, customTenor: 0, rateType: 'standard', principalAmount: 0, currency: 'NGN',
  maturityInstruction: { type: 'ROLLOVER_ALL' },
};

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <div key={step.number} className="flex items-center min-w-0">
          <div className="flex flex-col items-center">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all',
              currentStep > step.number ? 'bg-primary text-primary-foreground' :
              currentStep === step.number ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
              'bg-muted text-muted-foreground')}>
              {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
            </div>
            <span className={cn('text-xs mt-1 text-center whitespace-nowrap', currentStep === step.number ? 'text-primary font-medium' : 'text-muted-foreground')}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className={cn('h-px w-8 sm:w-16 mx-1 flex-shrink-0 mt-[-16px]', currentStep > step.number ? 'bg-primary' : 'bg-border')} />}
        </div>
      ))}
    </div>
  );
}

export function NewFixedDepositPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [createdFdNumber, setCreatedFdNumber] = useState<string | null>(null);

  // ── Customer search with debounce ──
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  const { data: customerResults = [], isFetching: searchingCustomers } = useCustomerSearch(debouncedSearch);
  const { data: customerAccounts = [] } = useCustomerAccounts(form.customerId);
  const activeAccounts = customerAccounts.filter((a: CustomerAccount) => a.status === 'ACTIVE');

  // ── Rates ──
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['fixed-deposits', 'rates'],
    queryFn: () => fixedDepositApi.getRateTables(),
    staleTime: 300_000,
  });

  // ── Server-side calculation ──
  const calcMutation = useCalculateInterest();
  const [serverCalc, setServerCalc] = useState<InterestCalcResult | null>(null);
  const calcTimer = useRef<ReturnType<typeof setTimeout>>();

  const selectedRateValue = form.selectedRate
    ? (form.rateType === 'standard' ? form.selectedRate.standardRate : form.selectedRate.premiumRate)
    : 0;
  const effectiveTenor = form.customTenor > 0 ? form.customTenor : (form.selectedRate?.tenor ?? 0);

  useEffect(() => {
    if (form.principalAmount > 0 && selectedRateValue > 0 && effectiveTenor > 0) {
      clearTimeout(calcTimer.current);
      calcTimer.current = setTimeout(() => {
        calcMutation.mutate(
          { principal: form.principalAmount, rate: selectedRateValue, tenor: effectiveTenor },
          { onSuccess: (r) => setServerCalc(r), onError: () => setServerCalc(null) },
        );
      }, 500);
    }
    return () => clearTimeout(calcTimer.current);
  }, [form.principalAmount, selectedRateValue, effectiveTenor]);

  // ── Create FD ──
  const createFd = useCreateFixedDeposit();

  const selectCustomer = (c: CustomerSummary) => {
    setForm((f) => ({ ...f, customerId: c.id, customerName: c.fullName, sourceAccountId: 0, sourceAccountNumber: '', sourceBalance: 0 }));
    setSearchQuery(c.fullName);
    setShowDropdown(false);
  };

  const selectAccount = (acc: CustomerAccount) => {
    setForm((f) => ({ ...f, sourceAccountId: acc.id, sourceAccountNumber: acc.accountNumber, sourceBalance: acc.availableBalance, currency: acc.currency }));
  };

  const canProceedStep1 = form.customerId > 0 && form.sourceAccountId > 0;
  const canProceedStep2 = form.selectedRate !== null || form.customTenor > 0;
  const canProceedStep3 = form.principalAmount >= 1000 && (form.sourceBalance <= 0 || form.principalAmount <= form.sourceBalance);
  const canProceed = step === 1 ? canProceedStep1 : step === 2 ? canProceedStep2 : step === 3 ? canProceedStep3 : true;

  function handleNext() {
    if (step < 5) { setStep((s) => s + 1); return; }
    createFd.mutate({
      customerId: String(form.customerId),
      sourceAccountId: String(form.sourceAccountId),
      principalAmount: form.principalAmount,
      currency: form.currency,
      tenor: effectiveTenor,
      rate: selectedRateValue,
      maturityInstruction: form.maturityInstruction,
    }, {
      onSuccess: (fd) => { setCreatedFdNumber(fd.fdNumber); setStep(6); toast.success(`Fixed deposit ${fd.fdNumber} created`); },
      onError: () => toast.error('Failed to create fixed deposit'),
    });
  }

  // ── Success screen ──
  if (step === 6 && createdFdNumber) {
    return (
      <>
        <PageHeader title="New Fixed Deposit" backTo="/accounts/fixed-deposits" />
        <div className="page-container flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
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
            <button onClick={() => navigate('/accounts/fixed-deposits')} className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back to Fixed Deposits</button>
            <button onClick={() => { setStep(1); setForm(INITIAL); setCreatedFdNumber(null); setSearchQuery(''); setServerCalc(null); }}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Place Another FD</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="New Fixed Deposit" subtitle="Place a new term deposit for a customer" backTo="/accounts/fixed-deposits" />
      <div className="page-container max-w-3xl space-y-6">
        <div className="rounded-lg border bg-card px-6 py-5"><StepIndicator currentStep={step} /></div>

        {/* ── Step 1: Customer & Account ── */}
        {step === 1 && (
          <FormSection title="Customer & Source Account" description="Search for the customer and select their source account">
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); if (!e.target.value) setForm((f) => ({ ...f, customerId: 0, customerName: '', sourceAccountId: 0, sourceAccountNumber: '', sourceBalance: 0 })); }}
                    onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                    placeholder="Search by name or customer number…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  {searchingCustomers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {showDropdown && customerResults.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border bg-card shadow-lg py-1 max-h-48 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button key={c.id} onClick={() => selectCustomer(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between">
                          <div><p className="font-medium">{c.fullName}</p><p className="text-xs text-muted-foreground font-mono">{c.customerNumber}</p></div>
                          <span className="text-xs text-muted-foreground">{c.type}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {form.customerId > 0 && <p className="mt-1 text-xs text-green-600">Customer: {form.customerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Source Account</label>
                {form.customerId > 0 ? (
                  activeAccounts.length > 0 ? (
                    <select value={form.sourceAccountId || ''} onChange={(e) => { const acc = activeAccounts.find((a: CustomerAccount) => a.id === Number(e.target.value)); if (acc) selectAccount(acc); }}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">Select source account…</option>
                      {activeAccounts.map((acc: CustomerAccount) => (
                        <option key={acc.id} value={acc.id}>{acc.accountNumber} — {acc.accountType} ({acc.currency} {formatMoney(acc.availableBalance, acc.currency)})</option>
                      ))}
                    </select>
                  ) : <p className="text-sm text-muted-foreground py-2">No active accounts found.</p>
                ) : <p className="text-sm text-muted-foreground py-2">Select a customer first.</p>}
                {form.sourceAccountId > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Available: <span className="font-mono font-medium">{formatMoney(form.sourceBalance, form.currency)}</span></p>
                )}
              </div>

              {form.sourceAccountId > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Currency</label>
                  <div className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono">{form.currency}</div>
                </div>
              )}
            </div>
          </FormSection>
        )}

        {/* ── Step 2: Tenor & Rate ── */}
        {step === 2 && (
          <FormSection title="Select Tenor & Rate" description="Choose the deposit tenor and applicable rate type">
            <div className="space-y-4">
              <div className="flex gap-3">
                {(['standard', 'premium'] as const).map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, rateType: t }))}
                    className={cn('flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                      form.rateType === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50')}>
                    {t === 'standard' ? 'Standard Rate' : 'Premium Rate'}
                  </button>
                ))}
              </div>
              {ratesLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : (
                <FdRateTable rates={rates} selectedTenor={form.selectedRate?.tenor} onSelect={(rate) => setForm((f) => ({ ...f, selectedRate: rate, customTenor: 0 }))} />
              )}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Or enter custom tenor (days)</label>
                <input type="number" min={1} value={form.customTenor || ''} onChange={(e) => setForm((f) => ({ ...f, customTenor: Number(e.target.value) }))}
                  placeholder="e.g. 45" className="w-32 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {(form.selectedRate || form.customTenor > 0) && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
                  Selected: <span className="font-semibold">{form.customTenor > 0 ? `${form.customTenor} days (custom)` : form.selectedRate!.tenorLabel}</span>
                  {selectedRateValue > 0 && <> at <span className="font-semibold">{formatPercent(selectedRateValue)} p.a.</span> ({form.rateType})</>}
                </div>
              )}
            </div>
          </FormSection>
        )}

        {/* ── Step 3: Amount ── */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormSection title="Principal Amount" description="Enter the amount to be deposited">
              <div className="space-y-4">
                <MoneyInput label="Principal Amount" value={form.principalAmount} onChange={(v) => setForm((f) => ({ ...f, principalAmount: v }))} currency={form.currency} min={1000} />
                <p className="text-xs text-muted-foreground">Available balance: <span className="font-mono font-medium">{formatMoney(form.sourceBalance, form.currency)}</span></p>
                {form.principalAmount > 0 && form.principalAmount < 1000 && <p className="text-xs text-red-500">Minimum deposit: {formatMoney(1000, form.currency)}</p>}
                {form.principalAmount > form.sourceBalance && form.sourceBalance > 0 && <p className="text-xs text-red-500">Exceeds available balance</p>}
                {form.principalAmount > 0 && form.sourceBalance > 0 && form.principalAmount > form.sourceBalance * 0.5 && form.principalAmount <= form.sourceBalance && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600"><AlertTriangle className="w-3.5 h-3.5" /> More than 50% of account balance</div>
                )}
              </div>
            </FormSection>
            <FdCalculator principal={form.principalAmount} rate={selectedRateValue} tenor={effectiveTenor} serverResult={serverCalc} isCalculating={calcMutation.isPending} currency={form.currency} />
          </div>
        )}

        {/* ── Step 4: Maturity Instruction ── */}
        {step === 4 && (
          <FormSection title="Maturity Instruction" description="Choose what happens when the FD matures">
            <FdMaturityInstruction value={form.maturityInstruction} onChange={(v) => setForm((f) => ({ ...f, maturityInstruction: v }))}
              accounts={activeAccounts} sourceAccountId={form.sourceAccountId} />
          </FormSection>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && (
          <FormSection title="Review Details" description="Please review all details before submitting">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <RR label="Customer" value={form.customerName} />
                <RR label="Source Account" value={form.sourceAccountNumber} mono />
                <RR label="Balance" value={formatMoney(form.sourceBalance, form.currency)} mono />
                <RR label="Currency" value={form.currency} />
                <RR label="Principal" value={formatMoney(form.principalAmount, form.currency)} mono />
                <RR label="Tenor" value={`${effectiveTenor} days${form.selectedRate ? ` (${form.selectedRate.tenorLabel})` : ' (custom)'}`} />
                <RR label="Rate" value={`${formatPercent(selectedRateValue)} p.a. (${form.rateType})`} mono />
                <RR label="Maturity Instruction" value={LABELS[form.maturityInstruction.type]} />
                {form.maturityInstruction.destinationAccountId && <RR label="Destination" value={form.maturityInstruction.destinationAccountId} mono />}
              </div>
              <FdCalculator principal={form.principalAmount} rate={selectedRateValue} tenor={effectiveTenor} serverResult={serverCalc} isCalculating={calcMutation.isPending} currency={form.currency} />
            </div>
          </FormSection>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40">Back</button>
          <button onClick={handleNext} disabled={!canProceed || createFd.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {createFd.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === 5 ? 'Create Fixed Deposit' : <><span>Next</span><ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </>
  );
}

const LABELS: Record<string, string> = { ROLLOVER_ALL: 'Auto-Rollover (P+I)', ROLLOVER_PRINCIPAL: 'Auto-Rollover (Principal)', LIQUIDATE: 'Liquidate to Account', MANUAL: 'Manual' };
function RR({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (<><div className="text-muted-foreground">{label}</div><div className={cn('font-medium', mono && 'font-mono')}>{value}</div></>);
}
