import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, FileText, Building2, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, EmptyState, StatCard, InfoGrid } from '@/components/shared';
import { FormSection } from '@/components/shared/FormSection';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useMortgage, useMortgageLtvHistory } from '../hooks/useMortgages';
import { useAdvanceMortgage, useOverpayMortgage, useRevertMortgageSvr } from '../hooks/useLendingExt';
import { PropertyDetailsCard } from '../components/mortgage/PropertyDetailsCard';
import { LtvTrackingChart } from '../components/mortgage/LtvTrackingChart';
import { MortgageCalculator } from '../components/mortgage/MortgageCalculator';
import { DisbursementMilestones } from '../components/mortgage/DisbursementMilestones';

const statusColor = (s: string) => s === 'ACTIVE' ? 'bg-green-100 text-green-800' : s === 'OVERDUE' || s === 'DEFAULT' ? 'bg-red-100 text-red-800' : s === 'CLOSED' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800';

export default function MortgageDetailPage() {
  useEffect(() => { document.title = 'Mortgage Detail | CBS'; }, []);
  const { id } = useParams<{ id: string }>();
  const loanId = Number(id);
  const [showOverpay, setShowOverpay] = useState(false);
  const [overpayAmount, setOverpayAmount] = useState(0);

  const { data: loan, isLoading } = useMortgage(loanId);
  const { data: ltvHistory } = useMortgageLtvHistory(loanId);
  const advanceMutation = useAdvanceMortgage();
  const overpayMutation = useOverpayMortgage();
  const revertMutation = useRevertMortgageSvr();

  if (isLoading) return <div className="p-6 space-y-4 animate-pulse"><div className="h-8 w-64 bg-muted rounded" /><div className="h-64 bg-muted rounded-lg" /></div>;
  if (!loan) return <EmptyState title="Mortgage not found" description="The requested mortgage could not be found." />;

  const ext = loan as any;
  const isActive = loan.status === 'ACTIVE';
  const isPreActive = ['APPLICATION', 'OFFER', 'EXCHANGE', 'COMPLETION'].includes(loan.status);
  const fixedExpired = ext.fixedRateEndDate && new Date(ext.fixedRateEndDate) < new Date();
  const overpayLimit = (ext.annualOverpaymentPct ?? 0.1) * (ext.principalAmount ?? loan.disbursedAmount);
  const overpayRemaining = Math.max(0, overpayLimit - (ext.overpaymentsYtd ?? 0));

  const handleOverpay = () => {
    overpayMutation.mutate(ext.mortgageNumber ?? loan.loanNumber, {
      onSuccess: () => { toast.success('Overpayment recorded'); setShowOverpay(false); },
      onError: () => toast.error('Failed'),
    });
  };

  const tabs = [
    {
      id: 'overview', label: 'Overview',
      content: (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6"><PropertyDetailsCard loan={loan} /><MortgageCalculator /></div>
          <div className="space-y-6">
            <LtvTrackingChart data={ltvHistory} />
            {loan.disbursementType === 'MILESTONE' && <DisbursementMilestones milestones={loan.disbursementMilestones} currency={loan.currency} />}
          </div>
        </div>
      ),
    },
    {
      id: 'payments', label: 'Payment History', icon: CreditCard,
      content: (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Monthly Payment" value={formatMoney(ext.monthlyPayment ?? 0, loan.currency)} />
            <StatCard label="Overpayments YTD" value={formatMoney(ext.overpaymentsYtd ?? 0, loan.currency)} />
            <StatCard label="Total Paid" value={formatMoney((ext.principalAmount ?? loan.disbursedAmount) - loan.outstandingBalance, loan.currency)} />
            <StatCard label="Remaining" value={formatMoney(loan.outstandingBalance, loan.currency)} />
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Overpayment Allowance</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Annual limit ({formatPercent(ext.annualOverpaymentPct ?? 10)})</span>
              <span className="font-mono font-medium">{formatMoney(overpayLimit, loan.currency)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${overpayLimit > 0 ? ((ext.overpaymentsYtd ?? 0) / overpayLimit) * 100 : 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Used: {formatMoney(ext.overpaymentsYtd ?? 0, loan.currency)}</span>
              <span>Remaining: {formatMoney(overpayRemaining, loan.currency)}</span>
            </div>
          </div>
          {ext.earlyRepaymentCharge > 0 && (
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/10 p-4 flex items-center justify-between">
              <div><p className="text-sm font-medium text-amber-800">Early Repayment Charge</p><p className="text-xs text-amber-600">Until {ext.ercEndDate ? formatDate(ext.ercEndDate) : '—'}</p></div>
              <span className="font-mono font-bold text-amber-800">{formatMoney(ext.earlyRepaymentCharge, loan.currency)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'rate', label: 'Rate & Terms', icon: BarChart3,
      content: (
        <div className="p-6 space-y-6">
          <FormSection title="Current Rate">
            <InfoGrid columns={4} items={[
              { label: 'Rate Type', value: ext.rateType ?? '—' },
              { label: 'Current Rate', value: formatPercent(ext.interestRate ?? loan.rate) },
              { label: 'Base Rate Ref', value: ext.baseRateReference ?? '—' },
              { label: 'Margin', value: ext.marginOverBase ? formatPercent(ext.marginOverBase) : '—' },
            ]} />
          </FormSection>
          <FormSection title="Fixed Rate Period">
            <InfoGrid columns={3} items={[
              { label: 'Fixed Ends', value: ext.fixedRateEndDate ? formatDate(ext.fixedRateEndDate) : '—' },
              { label: 'Reversion Rate', value: ext.reversionRate ? formatPercent(ext.reversionRate) : '—' },
              { label: 'Status', value: fixedExpired ? 'Expired — on SVR' : 'In fixed period' },
            ]} />
          </FormSection>
          <FormSection title="Key Dates">
            <div className="space-y-2">
              {[{ l: 'Completion', d: ext.completionDate }, { l: 'First Payment', d: ext.firstPaymentDate }, { l: 'Fixed Rate End', d: ext.fixedRateEndDate }, { l: 'ERC End', d: ext.ercEndDate }, { l: 'Maturity', d: ext.maturityDate }].filter((x) => x.d).map((x) => (
                <div key={x.l} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
                  <span className="text-muted-foreground">{x.l}</span><span className="font-mono">{formatDate(x.d!)}</span>
                </div>
              ))}
            </div>
          </FormSection>
        </div>
      ),
    },
    {
      id: 'property', label: 'Property & Insurance', icon: Building2,
      content: (
        <div className="p-6 space-y-6">
          <FormSection title="Property">
            <InfoGrid columns={3} items={[
              { label: 'Address', value: ext.propertyAddress ?? loan.propertyAddress ?? '—' },
              { label: 'Type', value: ext.propertyType ?? loan.propertyType ?? '—' },
              { label: 'Valuation', value: formatMoney(ext.propertyValuation ?? loan.propertyValue, loan.currency) },
              { label: 'Purchase Price', value: ext.purchasePrice ? formatMoney(ext.purchasePrice, loan.currency) : '—' },
            ]} />
          </FormSection>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">LTV</h3>
            <div className="flex items-center gap-4">
              {(() => {
                const ltv = ext.currentLtv ?? loan.ltv;
                const c = ltv < 80 ? '#22c55e' : ltv < 90 ? '#f59e0b' : '#ef4444';
                const circ = 2 * Math.PI * 40;
                return (
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (Math.min(ltv, 100) / 100) * circ} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold" style={{ color: c }}>{ltv.toFixed(0)}%</span></div>
                  </div>
                );
              })()}
              <div className="text-sm"><p>Current: <b>{formatPercent(ext.currentLtv ?? loan.ltv)}</b></p><p className="text-muted-foreground">At origination: {ext.ltvAtOrigination ? formatPercent(ext.ltvAtOrigination) : '—'}</p></div>
            </div>
          </div>
          <FormSection title="Insurance & Fees">
            <InfoGrid columns={3} items={[
              { label: 'Title Insurance', value: ext.titleInsuranceRef ?? '—', mono: true },
              { label: 'Building Insurance', value: ext.buildingInsuranceRef ?? '—', mono: true },
              { label: 'Portable', value: ext.isPortable ? 'Yes' : 'No' },
              { label: 'Stamp Duty', value: ext.stampDutyAmount ? formatMoney(ext.stampDutyAmount, loan.currency) : '—' },
              { label: 'Arrangement Fee', value: ext.arrangementFee ? formatMoney(ext.arrangementFee, loan.currency) : '—' },
            ]} />
          </FormSection>
        </div>
      ),
    },
    {
      id: 'documents', label: 'Documents', icon: FileText,
      content: (
        <div className="p-6 space-y-3">
          <h3 className="text-sm font-semibold mb-3">Document Checklist</h3>
          {['Title Deed', 'Sale Agreement', 'Valuation Report', 'Insurance Policy', 'ID Verification', 'Proof of Income'].map((doc) => (
            <div key={doc} className="flex items-center gap-3 py-2 border-b last:border-0">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">○</span>
              <span className="text-sm">{doc}</span>
              <span className="ml-auto text-xs text-muted-foreground">Pending</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground italic mt-4">Document upload is not wired to a backend document service from this mortgage view.</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={ext.mortgageNumber ?? loan.loanNumber} subtitle={`${loan.customerName} — Mortgage`} backTo="/lending/mortgages"
        actions={
          <div className="flex items-center gap-2">
            {isActive && <button onClick={() => setShowOverpay(true)} className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Overpayment</button>}
            {isPreActive && <button onClick={() => advanceMutation.mutate(ext.mortgageNumber ?? loan.loanNumber, { onSuccess: () => toast.success('Advanced'), onError: () => toast.error('Failed') })}
              disabled={advanceMutation.isPending} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {advanceMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />}Advance
            </button>}
            {isActive && fixedExpired && <button onClick={() => revertMutation.mutate(ext.mortgageNumber ?? loan.loanNumber, { onSuccess: () => toast.success('Reverted'), onError: () => toast.error('Failed') })}
              disabled={revertMutation.isPending} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">Revert SVR</button>}
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor(loan.status)}`}>{loan.status}</span>
          </div>
        }
      />
      <div className="border rounded-lg mx-6 overflow-hidden bg-card"><TabsPage tabs={tabs} syncWithUrl /></div>

      {showOverpay && (
        <><div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowOverpay(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">Record Overpayment</h3>
              <p className="text-xs text-muted-foreground">Max: {formatMoney(overpayRemaining, loan.currency)}</p>
              <input type="number" value={overpayAmount || ''} onChange={(e) => setOverpayAmount(Number(e.target.value))} max={overpayRemaining}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono" placeholder="Amount" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowOverpay(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleOverpay} disabled={overpayMutation.isPending || overpayAmount <= 0 || overpayAmount > overpayRemaining}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Record</button>
              </div>
            </div>
          </div></>
      )}
    </div>
  );
}
