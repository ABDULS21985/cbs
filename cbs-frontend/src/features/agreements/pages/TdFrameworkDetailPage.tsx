import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Calculator, BarChart3, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, StatCard, DataTable } from '@/components/shared';
import { FormSection } from '@/components/shared/FormSection';
import { formatMoney, formatDate, formatDateTime, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useTdFramework,
  useApproveTdFramework,
  useCheckTdRate,
  useTdMaturityLadder,
  useTdRolloverForecast,
  useTdHistory,
  useLargeDeposits,
} from '../hooks/useAgreementsExt';
import type { RateCheckResult, TdFrameworkSummary } from '../types/agreementExt';

const historyCols: ColumnDef<TdFrameworkSummary, unknown>[] = [
  { accessorKey: 'snapshotDate', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.snapshotDate)}</span> },
  { accessorKey: 'activeDeposits', header: 'Active', cell: ({ row }) => <span className="font-mono text-xs">{row.original.activeDeposits}</span> },
  { accessorKey: 'totalPrincipal', header: 'Principal', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.totalPrincipal)}</span> },
  { accessorKey: 'totalAccruedInterest', header: 'Accrued', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.totalAccruedInterest)}</span> },
  { accessorKey: 'weightedAvgRate', header: 'Wtd Rate', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.weightedAvgRate)}</span> },
  { accessorKey: 'concentrationPct', header: 'Concentration', cell: ({ row }) => <span className="font-mono text-xs">{formatPercent(row.original.concentrationPct)}</span> },
];

export function TdFrameworkDetailPage() {
  useEffect(() => { document.title = 'TD Framework Detail | CBS'; }, []);
  const { number } = useParams<{ number: string }>();
  const [showApprove, setShowApprove] = useState(false);
  const [approvedBy, setApprovedBy] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState(0);
  const [calcTenor, setCalcTenor] = useState(90);
  const [calcResult, setCalcResult] = useState<RateCheckResult | null>(null);

  const { data: agreement, isLoading } = useTdFramework(number ?? '');
  const approveMutation = useApproveTdFramework();
  const checkRateMutation = useCheckTdRate();
  const { data: history = [] } = useTdHistory(agreement?.id ?? 0);
  const { data: largeDeposits = [] } = useLargeDeposits();

  const latestSummary = history.length > 0 ? history[0] : null;

  if (isLoading || !agreement) {
    return (
      <>
        <PageHeader title="TD Framework Detail" backTo="/agreements/td-frameworks" />
        <div className="page-container"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>
      </>
    );
  }

  const canApprove = agreement.status === 'DRAFT' || agreement.status === 'PENDING_APPROVAL';
  const canCheckRate = agreement.status === 'ACTIVE';

  const handleApprove = () => {
    approveMutation.mutate({ agreementNumber: agreement.agreementNumber, approvedBy }, {
      onSuccess: () => { toast.success('Framework approved'); setShowApprove(false); },
      onError: () => toast.error('Failed to approve'),
    });
  };

  const handleCheckRate = () => {
    checkRateMutation.mutate({ agreementNumber: agreement.agreementNumber, amount: calcAmount, tenorDays: calcTenor }, {
      onSuccess: (data) => setCalcResult(data),
      onError: () => toast.error('Rate check failed'),
    });
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="p-6 space-y-6">
          <FormSection title="General Information">
            <InfoGrid columns={4} items={[
              { label: 'Agreement Number', value: agreement.agreementNumber },
              { label: 'Customer ID', value: String(agreement.customerId) },
              { label: 'Type', value: agreement.agreementType },
              { label: 'Currency', value: agreement.currency },
              { label: 'Status', value: agreement.status },
              { label: 'Effective From', value: formatDate(agreement.effectiveFrom) },
              { label: 'Effective To', value: agreement.effectiveTo ? formatDate(agreement.effectiveTo) : 'Open-ended' },
              { label: 'Approved By', value: agreement.approvedBy ?? '—' },
            ]} />
          </FormSection>
          <FormSection title="Deposit Limits & Tenor">
            <InfoGrid columns={4} items={[
              { label: 'Min Deposit', value: formatMoney(agreement.minDepositAmount, agreement.currency) },
              { label: 'Max Deposit', value: agreement.maxDepositAmount ? formatMoney(agreement.maxDepositAmount, agreement.currency) : 'Unlimited' },
              { label: 'Min Tenor', value: `${agreement.minTenorDays} days` },
              { label: 'Max Tenor', value: `${agreement.maxTenorDays} days` },
            ]} />
          </FormSection>
          <FormSection title="Rate Structure">
            <InfoGrid columns={4} items={[
              { label: 'Structure', value: agreement.rateStructure },
              { label: 'Base Rate', value: agreement.baseRate != null ? formatPercent(agreement.baseRate) : '—' },
              { label: 'Benchmark', value: agreement.benchmarkReference ?? '—' },
              { label: 'Spread', value: agreement.spreadOverBenchmark != null ? formatPercent(agreement.spreadOverBenchmark) : '—' },
            ]} />
            {agreement.rateStructure === 'TIERED' && agreement.rateTiers && (
              <div className="mt-4 rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30"><tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Min Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Max Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Rate (%)</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {(Array.isArray(agreement.rateTiers) ? agreement.rateTiers : []).map((tier: Record<string, unknown>, i: number) => (
                      <tr key={i}><td className="px-4 py-2 font-mono text-xs">{formatMoney(Number(tier.min_amount ?? 0), agreement.currency)}</td>
                        <td className="px-4 py-2 font-mono text-xs">{formatMoney(Number(tier.max_amount ?? 0), agreement.currency)}</td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-primary">{formatPercent(Number(tier.rate ?? 0))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormSection>
          <FormSection title="Rollover & Withdrawal">
            <InfoGrid columns={4} items={[
              { label: 'Auto Rollover', value: agreement.autoRolloverEnabled ? 'Enabled' : 'Disabled' },
              { label: 'Rollover Tenor', value: agreement.rolloverTenorDays ? `${agreement.rolloverTenorDays} days` : '—' },
              { label: 'Early Withdrawal', value: agreement.earlyWithdrawalAllowed ? 'Allowed' : 'Not Allowed' },
              { label: 'Penalty', value: agreement.earlyWithdrawalPenaltyPct != null ? formatPercent(agreement.earlyWithdrawalPenaltyPct) : '—' },
            ]} />
          </FormSection>
        </div>
      ),
    },
    {
      id: 'summary',
      label: 'Summary Analytics',
      content: (
        <div className="p-6 space-y-6">
          {latestSummary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Active Deposits" value={latestSummary.activeDeposits} format="number" icon={Landmark} />
                <StatCard label="Total Principal" value={latestSummary.totalPrincipal} format="money" compact />
                <StatCard label="Accrued Interest" value={latestSummary.totalAccruedInterest} format="money" compact />
                <StatCard label="Wtd Avg Rate" value={latestSummary.weightedAvgRate} format="percent" />
                <StatCard label="Concentration" value={latestSummary.concentrationPct} format="percent" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[{ label: 'Next 30 Days', value: latestSummary.maturingNext30Days }, { label: 'Next 60 Days', value: latestSummary.maturingNext60Days }, { label: 'Next 90 Days', value: latestSummary.maturingNext90Days }].map((m) => (
                  <div key={m.label} className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold font-mono">{formatMoney(m.value)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Expected Rollover Rate</p>
                <p className="text-3xl font-bold font-mono text-primary">{formatPercent(latestSummary.expectedRolloverPct)}</p>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No summary data available yet</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'history',
      label: 'History',
      badge: history.length || undefined,
      content: (
        <div className="p-6">
          <DataTable columns={historyCols} data={history} enableGlobalFilter enableExport exportFilename={`td-framework-${number}-history`} emptyMessage="No snapshot history" />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={agreement.agreementNumber} subtitle={`${agreement.agreementType} · ${agreement.currency}`} backTo="/agreements/td-frameworks"
        actions={
          <div className="flex items-center gap-2">
            {canApprove && <button onClick={() => setShowApprove(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"><CheckCircle className="w-4 h-4" /> Approve</button>}
            {canCheckRate && <button onClick={() => setShowCalc(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"><Calculator className="w-4 h-4" /> Check Rate</button>}
            <StatusBadge status={agreement.status} dot />
          </div>
        }
      />
      <div className="page-container p-0"><TabsPage tabs={tabs} defaultTab="overview" syncWithUrl /></div>

      {showApprove && (
        <><div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowApprove(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Approve Framework</h3>
              <input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Your name" className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowApprove(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleApprove} disabled={!approvedBy.trim() || approveMutation.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Approve</button>
              </div>
            </div>
          </div></>
      )}

      {showCalc && (
        <><div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCalc(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold">Rate Calculator</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-xs font-medium uppercase">Amount</label><input type="number" value={calcAmount || ''} onChange={(e) => setCalcAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium uppercase">Tenor (days)</label><input type="number" value={calcTenor} onChange={(e) => setCalcTenor(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              </div>
              <button onClick={handleCheckRate} disabled={checkRateMutation.isPending || !calcAmount} className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">Check Rate</button>
              {calcResult && <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4 text-center"><p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatPercent(calcResult.applicable_rate)}</p></div>}
              <div className="flex justify-end"><button onClick={() => setShowCalc(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Close</button></div>
            </div>
          </div></>
      )}
    </>
  );
}
