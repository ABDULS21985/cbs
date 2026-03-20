import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, Home, Calculator } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api';
import type { MortgageLoan } from '../types/mortgageExt';

const STEPS = ['Property & Borrower', 'Loan Terms', 'Fees & Review'];
const MORTGAGE_TYPES = ['PURCHASE', 'REMORTGAGE', 'BUY_TO_LET', 'HELP_TO_BUY', 'SHARED_OWNERSHIP'];
const PROPERTY_TYPES = ['HOUSE', 'FLAT', 'BUNGALOW', 'COMMERCIAL'];
const REPAYMENT_TYPES = ['CAPITAL_AND_INTEREST', 'INTEREST_ONLY'];
const RATE_TYPES = ['FIXED', 'VARIABLE', 'TRACKER'];

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2',
              i < current ? 'bg-green-500 border-green-500 text-white' : i === current ? 'border-primary text-primary bg-background ring-2 ring-primary/20' : 'border-muted-foreground/30 text-muted-foreground bg-background')}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('text-[10px] whitespace-nowrap', i === current ? 'text-primary font-semibold' : 'text-muted-foreground')}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 mx-1.5', i < current ? 'bg-green-500' : 'bg-muted')} />}
        </div>
      ))}
    </div>
  );
}

function LtvGauge({ ltv }: { ltv: number }) {
  const color = ltv > 90 ? '#ef4444' : ltv > 80 ? '#f59e0b' : ltv > 60 ? '#3b82f6' : '#10b981';
  const label = ltv > 95 ? 'CRITICAL' : ltv > 90 ? 'HIGH' : ltv > 80 ? 'MODERATE' : 'GOOD';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ltv)}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold font-mono" style={{ color }}>{ltv.toFixed(1)}%</span>
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

export function MortgageOriginationPage() {
  useEffect(() => { document.title = 'New Mortgage | CBS'; }, []);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 fields
  const [customerId, setCustomerId] = useState(0);
  const [accountId, setAccountId] = useState(0);
  const [mortgageType, setMortgageType] = useState('PURCHASE');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState('HOUSE');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [propertyValuation, setPropertyValuation] = useState(0);
  const [valuationDate, setValuationDate] = useState('');

  // Step 2 fields
  const [principalAmount, setPrincipalAmount] = useState(0);
  const [repaymentType, setRepaymentType] = useState('CAPITAL_AND_INTEREST');
  const [rateType, setRateType] = useState('FIXED');
  const [interestRate, setInterestRate] = useState(7.5);
  const [fixedRateEndDate, setFixedRateEndDate] = useState('');
  const [baseRateReference, setBaseRateReference] = useState('CBN_MPR');
  const [marginOverBase, setMarginOverBase] = useState(2.5);
  const [termMonths, setTermMonths] = useState(300);
  const [annualOverpaymentPct, setAnnualOverpaymentPct] = useState(10);

  // Step 3 fields
  const [stampDutyAmount, setStampDutyAmount] = useState(0);
  const [arrangementFee, setArrangementFee] = useState(0);
  const [earlyRepaymentCharge, setEarlyRepaymentCharge] = useState(0);
  const [ercEndDate, setErcEndDate] = useState('');
  const [titleInsuranceRef, setTitleInsuranceRef] = useState('');
  const [buildingInsuranceRef, setBuildingInsuranceRef] = useState('');

  // Auto-suggest principal from purchase price
  useEffect(() => {
    if (purchasePrice > 0 && principalAmount === 0) {
      setPrincipalAmount(Math.round(purchasePrice * 0.8)); // 80% default LTV
    }
  }, [purchasePrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // LTV calculation
  const ltv = useMemo(() => propertyValuation > 0 ? (principalAmount / propertyValuation) * 100 : 0, [principalAmount, propertyValuation]);

  // Monthly payment calculation (PMT formula)
  const monthlyPayment = useMemo(() => {
    if (principalAmount <= 0 || interestRate <= 0 || termMonths <= 0) return 0;
    if (repaymentType === 'INTEREST_ONLY') return (principalAmount * interestRate / 100) / 12;
    const r = interestRate / 100 / 12;
    const n = termMonths;
    return (principalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [principalAmount, interestRate, termMonths, repaymentType]);

  const totalCost = monthlyPayment * termMonths;

  const originateMut = useMutation({
    mutationFn: () => apiPost<MortgageLoan>('/api/v1/mortgages', {
      customerId, accountId, mortgageType, propertyAddress, propertyType,
      purchasePrice, propertyValuation, valuationDate, principalAmount,
      repaymentType, rateType, interestRate, fixedRateEndDate,
      baseRateReference, marginOverBase, termMonths, annualOverpaymentPct,
      stampDutyAmount, arrangementFee, earlyRepaymentCharge, ercEndDate,
      titleInsuranceRef, buildingInsuranceRef, currency: 'NGN',
    }),
    onSuccess: (data) => {
      toast.success('Mortgage application submitted');
      navigate(`/lending/mortgages/${data.id}`);
    },
    onError: () => toast.error('Failed to submit mortgage'),
  });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Cancel'}
        </button>
        <h1 className="text-lg font-semibold">New Mortgage Application</h1>
      </div>

      <Stepper steps={STEPS} current={step} />

      <div className="bg-card rounded-xl border p-6">
        {/* Step 1 — Property & Borrower */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Property & Borrower Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
                <input type="number" value={customerId || ''} onChange={e => setCustomerId(Number(e.target.value))} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Account ID *</label>
                <input type="number" value={accountId || ''} onChange={e => setAccountId(Number(e.target.value))} className={fc} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Mortgage Type</label>
                <select value={mortgageType} onChange={e => setMortgageType(e.target.value)} className={fc}>
                  {MORTGAGE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Property Type</label>
                <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className={fc}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Property Address *</label>
              <textarea value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} rows={2} className={fc} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Purchase Price *</label>
                <input type="number" value={purchasePrice || ''} onChange={e => setPurchasePrice(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Property Valuation *</label>
                <input type="number" value={propertyValuation || ''} onChange={e => setPropertyValuation(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Valuation Date</label>
                <input type="date" value={valuationDate} onChange={e => setValuationDate(e.target.value)} className={fc} /></div>
            </div>
            {propertyValuation > 0 && principalAmount > 0 && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Loan-to-Value (LTV)</p>
                <LtvGauge ltv={ltv} />
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setStep(1)} disabled={!customerId || !propertyAddress || !purchasePrice}
                className="flex items-center gap-1 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Loan Terms */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Loan Terms</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Loan Amount *</label>
                <input type="number" value={principalAmount || ''} onChange={e => setPrincipalAmount(Number(e.target.value))} className={cn(fc, 'font-mono text-lg font-bold')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Repayment Type</label>
                <select value={repaymentType} onChange={e => setRepaymentType(e.target.value)} className={fc}>
                  {REPAYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Rate Type</label>
                <select value={rateType} onChange={e => setRateType(e.target.value)} className={fc}>
                  {RATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Interest Rate (%)</label>
                <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
              {rateType === 'FIXED' && (
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Fixed Rate End</label>
                  <input type="date" value={fixedRateEndDate} onChange={e => setFixedRateEndDate(e.target.value)} className={fc} /></div>
              )}
              {(rateType === 'VARIABLE' || rateType === 'TRACKER') && (
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Margin Over Base (%)</label>
                  <input type="number" step="0.01" value={marginOverBase} onChange={e => setMarginOverBase(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Term: {Math.floor(termMonths / 12)} years ({termMonths} months)</label>
                <input type="range" min={60} max={420} step={12} value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className="w-full" />
              </div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Annual Overpayment %</label>
                <input type="number" value={annualOverpaymentPct} onChange={e => setAnnualOverpaymentPct(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
            </div>
            {monthlyPayment > 0 && (
              <div className="rounded-lg border bg-primary/5 p-4 flex items-center gap-4">
                <Calculator className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Payment</p>
                  <p className="text-xl font-bold font-mono text-primary">{formatMoney(monthlyPayment)}</p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-sm font-mono">{formatMoney(totalCost)}</p>
                </div>
                <div className="border-l pl-4">
                  <p className="text-xs text-muted-foreground">Total Interest</p>
                  <p className="text-sm font-mono">{formatMoney(totalCost - principalAmount)}</p>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => setStep(2)} disabled={principalAmount <= 0}
                className="flex items-center gap-1 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Fees & Review */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Fees & Insurance</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Stamp Duty</label>
                <input type="number" value={stampDutyAmount || ''} onChange={e => setStampDutyAmount(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Arrangement Fee</label>
                <input type="number" value={arrangementFee || ''} onChange={e => setArrangementFee(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Early Repayment Charge</label>
                <input type="number" value={earlyRepaymentCharge || ''} onChange={e => setEarlyRepaymentCharge(Number(e.target.value))} className={cn(fc, 'font-mono')} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">ERC End Date</label>
                <input type="date" value={ercEndDate} onChange={e => setErcEndDate(e.target.value)} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Title Insurance Ref</label>
                <input value={titleInsuranceRef} onChange={e => setTitleInsuranceRef(e.target.value)} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Building Insurance Ref</label>
                <input value={buildingInsuranceRef} onChange={e => setBuildingInsuranceRef(e.target.value)} className={fc} /></div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border p-5 bg-muted/20 space-y-3 mt-4">
              <div className="flex items-center gap-2"><Home className="w-5 h-5 text-primary" /><h3 className="text-base font-bold">Mortgage Summary</h3></div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{mortgageType.replace(/_/g, ' ')}</p></div>
                <div><p className="text-xs text-muted-foreground">Property</p><p className="font-medium">{propertyType} — {propertyAddress.slice(0, 40)}{propertyAddress.length > 40 ? '…' : ''}</p></div>
                <div><p className="text-xs text-muted-foreground">Purchase Price</p><p className="font-mono font-bold">{formatMoney(purchasePrice)}</p></div>
                <div><p className="text-xs text-muted-foreground">Loan Amount</p><p className="font-mono font-bold text-primary">{formatMoney(principalAmount)}</p></div>
                <div><p className="text-xs text-muted-foreground">LTV</p><p className={cn('font-mono font-bold', ltv > 90 ? 'text-red-600' : ltv > 80 ? 'text-amber-600' : 'text-green-600')}>{ltv.toFixed(1)}%</p></div>
                <div><p className="text-xs text-muted-foreground">Rate</p><p className="font-mono">{interestRate}% ({rateType})</p></div>
                <div><p className="text-xs text-muted-foreground">Term</p><p className="font-medium">{Math.floor(termMonths / 12)} years</p></div>
                <div><p className="text-xs text-muted-foreground">Monthly Payment</p><p className="font-mono font-bold text-lg">{formatMoney(monthlyPayment)}</p></div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2 text-sm border rounded-lg hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => originateMut.mutate()} disabled={originateMut.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {originateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Home className="w-4 h-4" />}
                Submit Mortgage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
