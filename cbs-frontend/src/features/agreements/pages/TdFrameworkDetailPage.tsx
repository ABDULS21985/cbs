import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { formatMoney, formatDate, formatDateTime, formatPercent } from '@/lib/formatters';
import {
  useTdFramework,
  useApproveTdFramework,
  useCheckTdRate,
} from '../hooks/useAgreementsExt';
import type { RateCheckResult } from '../types/agreementExt';

export function TdFrameworkDetailPage() {
  useEffect(() => { document.title = 'TD Framework Detail | CBS'; }, []);
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const [showApprove, setShowApprove] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState(0);
  const [calcTenor, setCalcTenor] = useState(90);
  const [calcResult, setCalcResult] = useState<RateCheckResult | null>(null);

  const { data: agreement, isLoading } = useTdFramework(number ?? '');
  const approveMutation = useApproveTdFramework();
  const checkRateMutation = useCheckTdRate();

  if (isLoading || !agreement) {
    return (
      <>
        <PageHeader title="TD Framework Detail" />
        <div className="page-container"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>
      </>
    );
  }

  const canApprove = agreement.status === 'DRAFT' || agreement.status === 'PENDING_APPROVAL';
  const canCheckRate = agreement.status === 'ACTIVE';

  const handleApprove = () => {
    approveMutation.mutate(
      { number: agreement.agreementNumber, approvedBy },
      {
        onSuccess: () => { toast.success('Framework approved'); setShowApprove(false); },
        onError: () => toast.error('Failed to approve'),
      },
    );
  };

  const handleCheckRate = () => {
    checkRateMutation.mutate(
      { number: agreement.agreementNumber, amount: calcAmount, tenorDays: calcTenor },
      {
        onSuccess: (data) => setCalcResult(data),
        onError: () => toast.error('Rate check failed'),
      },
    );
  };

  return (
    <>
      <PageHeader
        title={agreement.agreementNumber}
        subtitle={`${agreement.agreementType} · ${agreement.currency}`}
        actions={
          <div className="flex items-center gap-2">
            {canApprove && (
              <button onClick={() => setShowApprove(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            )}
            {canCheckRate && (
              <button onClick={() => setShowCalc(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <Calculator className="w-4 h-4" /> Check Rate
              </button>
            )}
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* General */}
        <FormSection title="General Information">
          <InfoGrid columns={4} items={[
            { label: 'Agreement Number', value: agreement.agreementNumber, mono: true },
            { label: 'Customer ID', value: agreement.customerId },
            { label: 'Agreement Type', value: agreement.agreementType },
            { label: 'Currency', value: agreement.currency },
            { label: 'Status', value: <StatusBadge status={agreement.status} /> },
            { label: 'Effective From', value: formatDate(agreement.effectiveFrom) },
            { label: 'Effective To', value: agreement.effectiveTo ? formatDate(agreement.effectiveTo) : 'Open-ended' },
          ]} />
        </FormSection>

        {/* Deposit Limits */}
        <FormSection title="Deposit Limits">
          <InfoGrid columns={4} items={[
            { label: 'Min Deposit Amount', value: formatMoney(agreement.minDepositAmount, agreement.currency) },
            { label: 'Max Deposit Amount', value: agreement.maxDepositAmount ? formatMoney(agreement.maxDepositAmount, agreement.currency) : 'Unlimited' },
          ]} />
        </FormSection>

        {/* Tenor */}
        <FormSection title="Tenor">
          <InfoGrid columns={4} items={[
            { label: 'Min Tenor', value: `${agreement.minTenorDays} days` },
            { label: 'Max Tenor', value: `${agreement.maxTenorDays} days` },
          ]} />
        </FormSection>

        {/* Rate Structure */}
        <FormSection title="Rate Structure">
          <InfoGrid columns={4} items={[
            { label: 'Rate Structure', value: agreement.rateStructure },
            { label: 'Base Rate', value: agreement.baseRate != null ? formatPercent(agreement.baseRate) : '—' },
            { label: 'Benchmark Reference', value: agreement.benchmarkReference ?? '—' },
            { label: 'Spread Over Benchmark', value: agreement.spreadOverBenchmark != null ? formatPercent(agreement.spreadOverBenchmark) : '—' },
          ]} />

          {agreement.rateStructure === 'TIERED' && agreement.rateTiers && agreement.rateTiers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rate Tiers</h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Min Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Max Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {agreement.rateTiers.map((tier, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs">{formatMoney(tier.min_amount, agreement.currency)}</td>
                        <td className="px-4 py-2 font-mono text-xs">{formatMoney(tier.max_amount, agreement.currency)}</td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-primary">{formatPercent(tier.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </FormSection>

        {/* Rollover Policy */}
        <FormSection title="Rollover Policy">
          <InfoGrid columns={4} items={[
            { label: 'Auto Rollover', value: agreement.autoRolloverEnabled ? 'Enabled' : 'Disabled' },
            { label: 'Rollover Tenor', value: agreement.rolloverTenorDays ? `${agreement.rolloverTenorDays} days` : '—' },
            { label: 'Rollover Rate Type', value: agreement.rolloverRateType },
            { label: 'Maturity Instruction', value: agreement.maturityInstruction.replace(/_/g, ' ') },
          ]} />
        </FormSection>

        {/* Withdrawal Rules */}
        <FormSection title="Withdrawal Rules">
          <InfoGrid columns={4} items={[
            { label: 'Early Withdrawal', value: agreement.earlyWithdrawalAllowed ? 'Allowed' : 'Not Allowed' },
            { label: 'Early Withdrawal Penalty', value: agreement.earlyWithdrawalPenaltyPct != null ? formatPercent(agreement.earlyWithdrawalPenaltyPct) : '—' },
            { label: 'Partial Withdrawal', value: agreement.partialWithdrawalAllowed ? 'Allowed' : 'Not Allowed' },
            { label: 'Partial Withdrawal Min', value: agreement.partialWithdrawalMin ? formatMoney(agreement.partialWithdrawalMin, agreement.currency) : '—' },
          ]} />
        </FormSection>

        {/* Audit */}
        <FormSection title="Audit">
          <InfoGrid columns={4} items={[
            { label: 'Approved By', value: agreement.approvedBy ?? '—' },
            { label: 'Created At', value: formatDateTime(agreement.createdAt) },
            { label: 'Updated At', value: formatDateTime(agreement.updatedAt) },
          ]} />
        </FormSection>
      </div>

      {/* Approve Dialog */}
      {showApprove && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowApprove(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Approve Framework</h3>
              <input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Your name"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowApprove(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleApprove} disabled={!approvedBy.trim() || approveMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Approve</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rate Calculator Dialog */}
      {showCalc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCalc(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Rate Calculator</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide">Amount</label>
                  <input type="number" value={calcAmount || ''} onChange={(e) => setCalcAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide">Tenor (days)</label>
                  <input type="number" value={calcTenor} onChange={(e) => setCalcTenor(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <button onClick={handleCheckRate} disabled={checkRateMutation.isPending || !calcAmount}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Check Rate</button>
              {calcResult && (
                <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPercent(calcResult.applicable_rate)}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => setShowCalc(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Close</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
