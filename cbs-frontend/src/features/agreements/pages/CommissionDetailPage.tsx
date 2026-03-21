import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, Calculator, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { FormSection } from '@/components/shared/FormSection';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { PayoutBreakdownCard } from '../components/PayoutBreakdownCard';
import {
  useCommissionAgreement,
  usePartyPayouts,
  useActivateCommissionAgreement,
  useCalculatePayout,
  useApprovePayout,
} from '../hooks/useAgreementsExt';
import { useHasRole } from '@/hooks/usePermission';
import type { CommissionPayout } from '../types/agreementExt';

export function CommissionDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const isAdmin = useHasRole('CBS_ADMIN');
  const { data: agreement, isLoading, error } = useCommissionAgreement(code ?? '');
  const { data: payouts = [] } = usePartyPayouts(agreement?.partyId ?? '');
  const activateMut = useActivateCommissionAgreement();
  const calcMut = useCalculatePayout();
  const approveMut = useApprovePayout();

  const [showCalc, setShowCalc] = useState(false);
  const [grossSales, setGrossSales] = useState(0);
  const [qualifyingSales, setQualifyingSales] = useState(0);
  const [period, setPeriod] = useState('');
  const [calcResult, setCalcResult] = useState<CommissionPayout | null>(null);

  // Payout stats
  const totalPaid = useMemo(() => payouts.filter((p) => p.status === 'APPROVED' || p.status === 'PAID').reduce((s, p) => s + p.netCommission, 0), [payouts]);
  const totalPending = useMemo(() => payouts.filter((p) => p.status === 'CALCULATED').reduce((s, p) => s + p.netCommission, 0), [payouts]);
  const avgRate = useMemo(() => {
    const rated = payouts.filter((p) => p.commissionRateApplied > 0);
    return rated.length > 0 ? rated.reduce((s, p) => s + p.commissionRateApplied, 0) / rated.length : 0;
  }, [payouts]);

  // Chart data
  const chartData = useMemo(() => {
    const byPeriod = new Map<string, number>();
    payouts.forEach((p) => { byPeriod.set(p.payoutPeriod, (byPeriod.get(p.payoutPeriod) ?? 0) + p.netCommission); });
    return Array.from(byPeriod.entries()).map(([period, amount]) => ({ period, amount })).reverse();
  }, [payouts]);

  const payoutColumns: ColumnDef<CommissionPayout>[] = [
    { accessorKey: 'payoutCode', header: 'Code', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'payoutPeriod', header: 'Period' },
    { accessorKey: 'grossSales', header: 'Gross Sales', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.grossSales, row.original.currency || 'NGN')}</span> },
    { accessorKey: 'grossCommission', header: 'Gross Comm.', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.grossCommission, row.original.currency || 'NGN')}</span> },
    { accessorKey: 'taxAmount', header: 'Tax', cell: ({ row }) => <span className="tabular-nums text-amber-600">{formatMoney(row.original.taxAmount, row.original.currency || 'NGN')}</span> },
    {
      accessorKey: 'netCommission', header: 'Net', cell: ({ row }) => (
        <span className={cn('tabular-nums font-bold', row.original.netCommission > 0 ? 'text-green-700' : 'text-red-600')}>
          {formatMoney(row.original.netCommission, row.original.currency || 'NGN')}
        </span>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue<string>()} /> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        if (row.original.status !== 'CALCULATED' || !isAdmin) return null;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); approveMut.mutate(row.original.payoutCode, { onSuccess: () => toast.success('Approved') }); }}
            className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
          >
            Approve
          </button>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/agreements/commissions" />
        <div className="page-container"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>
      </>
    );
  }

  if (error || !agreement) {
    return (
      <>
        <PageHeader title="Agreement Not Found" backTo="/agreements/commissions" />
        <div className="page-container">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm font-medium text-destructive">Commission agreement could not be loaded</p>
          </div>
        </div>
      </>
    );
  }

  const handleCalculate = () => {
    if (!grossSales || !qualifyingSales || !period) { toast.error('Please fill all fields'); return; }
    calcMut.mutate({ code: agreement.agreementCode, params: { grossSales, qualifyingSales, period } }, {
      onSuccess: (payout) => { toast.success('Payout calculated'); setCalcResult(payout); },
      onError: () => toast.error('Calculation failed'),
    });
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader
        title={agreement.agreementName}
        subtitle={agreement.agreementCode}
        backTo="/agreements/commissions"
        actions={
          <div className="flex items-center gap-2">
            {agreement.status === 'DRAFT' && isAdmin && (
              <button
                onClick={() => activateMut.mutate(agreement.agreementCode, { onSuccess: () => toast.success('Activated') })}
                disabled={activateMut.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Activate
              </button>
            )}
            {agreement.status === 'ACTIVE' && isAdmin && (
              <button
                onClick={() => setShowCalc(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Calculator className="w-4 h-4" /> Calculate Payout
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Status badge */}
        <StatusBadge status={agreement.status} />

        {/* Agreement Info */}
        <FormSection title="Agreement Information">
          <InfoGrid
            columns={3}
            items={[
              { label: 'Agreement Code', value: agreement.agreementCode, mono: true, copyable: true },
              { label: 'Agreement Name', value: agreement.agreementName },
              { label: 'Type', value: agreement.agreementType },
              { label: 'Status', value: <StatusBadge status={agreement.status} /> },
              { label: 'Effective From', value: agreement.effectiveFrom || '—', format: 'date' },
              { label: 'Effective To', value: agreement.effectiveTo || 'No end date', format: agreement.effectiveTo ? 'date' : undefined },
            ]}
          />
        </FormSection>

        {/* Party Info */}
        <FormSection title="Party Information">
          <InfoGrid
            columns={2}
            items={[
              { label: 'Party ID', value: agreement.partyId, mono: true, copyable: true },
              { label: 'Party Name', value: agreement.partyName },
            ]}
          />
        </FormSection>

        {/* Commission Structure */}
        <FormSection title="Commission Structure">
          <InfoGrid
            columns={3}
            items={[
              { label: 'Commission Basis', value: agreement.commissionBasis },
              { label: 'Base Rate', value: agreement.baseRatePct != null ? formatPercent(agreement.baseRatePct) : '—' },
              { label: 'Applicable Products', value: agreement.applicableProducts?.length > 0
                ? (
                  <div className="flex flex-wrap gap-1">
                    {agreement.applicableProducts.map((p) => (
                      <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground font-mono">{p}</span>
                    ))}
                  </div>
                ) : '—'
              },
            ]}
          />
        </FormSection>

        {/* Payout Limits */}
        <FormSection title="Payout Limits">
          <InfoGrid
            columns={3}
            items={[
              { label: 'Min Payout', value: agreement.minPayout || 0, format: 'money' },
              { label: 'Max Monthly', value: agreement.maxPayoutMonthly || 0, format: 'money' },
              { label: 'Max Annual', value: agreement.maxPayoutAnnual || 0, format: 'money' },
            ]}
          />
        </FormSection>

        {/* Clawback Rules */}
        <FormSection title="Clawback Rules">
          <InfoGrid
            columns={2}
            items={[
              { label: 'Clawback Period (Days)', value: agreement.clawbackPeriodDays ?? '—' },
              { label: 'Conditions', value: agreement.clawbackConditions ? JSON.stringify(agreement.clawbackConditions, null, 2) : 'None' },
            ]}
          />
        </FormSection>

        {/* Tier Structure */}
        {agreement.tierStructure && Array.isArray(agreement.tierStructure) && agreement.tierStructure.length > 0 && (
          <FormSection title="Tier Structure">
            <div className="bg-card rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Range</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agreement.tierStructure.map((tier: Record<string, unknown>, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3">{i + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs">{JSON.stringify(tier)}</td>
                      <td className="px-4 py-3">{String(tier.rate ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>
        )}

        {/* Party Payouts */}
        <FormSection title="Party Payouts">
          <div className="space-y-4">
            {/* Payout stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card">
                <div className="stat-label">Total Paid</div>
                <div className="stat-value text-sm text-green-700">{formatMoney(totalPaid, 'NGN')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Pending</div>
                <div className="stat-value text-sm text-amber-700">{formatMoney(totalPending, 'NGN')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Commission Rate</div>
                <div className="stat-value text-sm">{formatPercent(avgRate)}</div>
              </div>
            </div>

            {/* Payout chart */}
            {chartData.length > 0 && (
              <div className="bg-card rounded-lg border p-4">
                <h4 className="text-sm font-semibold mb-3">Payout by Period</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Net Commission']} />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Payout table */}
            <DataTable
              columns={payoutColumns}
              data={payouts}
              enableGlobalFilter
              emptyMessage="No payouts recorded for this party"
            />
          </div>
        </FormSection>
      </div>

      {/* Calculate Payout Dialog */}
      {showCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCalc(false); setCalcResult(null); }} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Calculate Payout</h2>
              <button onClick={() => { setShowCalc(false); setCalcResult(null); }} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <span className="sr-only">Close</span>&times;
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {!calcResult ? (
                <>
                  <MoneyInput label="Gross Sales" value={grossSales} onChange={setGrossSales} currency="NGN" />
                  <MoneyInput label="Qualifying Sales" value={qualifyingSales} onChange={setQualifyingSales} currency="NGN" />
                  <div>
                    <label className="block text-sm font-medium mb-1">Period</label>
                    <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. 2025-Q1" className={inputCls} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowCalc(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={handleCalculate} disabled={calcMut.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                      <Calculator className="w-4 h-4" /> {calcMut.isPending ? 'Calculating...' : 'Calculate'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <PayoutBreakdownCard payout={calcResult} />
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => { setShowCalc(false); setCalcResult(null); }} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Close</button>
                    {calcResult.status === 'CALCULATED' && (
                      <button
                        onClick={() => approveMut.mutate(calcResult.payoutCode, { onSuccess: () => { toast.success('Approved'); setShowCalc(false); setCalcResult(null); } })}
                        disabled={approveMut.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
