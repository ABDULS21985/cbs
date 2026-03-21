import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getRecurringDepositById, recurringDepositApi, type RecurringDeposit, type RDInstallment } from '../api/goalApi';
import { PenaltyAlertBanner } from '../components/recurring/PenaltyAlertBanner';
import { PaymentProgressBar } from '../components/recurring/PaymentProgressBar';
import { InstallmentScheduleTable } from '../components/recurring/InstallmentScheduleTable';
import { DepositProjectionChart } from '../components/recurring/DepositProjectionChart';
import { PayInstallmentDialog } from '../components/recurring/PayInstallmentDialog';

export function RecurringDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPay, setShowPay] = useState(false);

  const { data: rd, isLoading } = useQuery({ queryKey: ['recurring-deposit', id], queryFn: () => getRecurringDepositById(id!), enabled: !!id });
  const { data: rdDetail } = useQuery({ queryKey: ['recurring-deposit-detail', id], queryFn: () => recurringDepositApi.getDetail(id!), enabled: !!id });

  const schedule = useMemo(() => {
    if (rdDetail?.installments?.length) return rdDetail.installments;
    return [];
  }, [rdDetail]);

  if (isLoading) return <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;
  if (!rd) return <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground"><RefreshCw className="w-10 h-10 opacity-30" /><p className="font-medium">Not found</p><button onClick={() => navigate('/accounts/recurring-deposits')} className="text-primary text-sm hover:underline">Back</button></div>;

  const pct = rd.totalInstallments > 0 ? Math.round((rd.completedInstallments / rd.totalInstallments) * 100) : 0;
  const totalPaid = rd.totalDeposited;
  const totalExpected = rd.installmentAmount * rd.totalInstallments;
  const overdueCount = rd.missedInstallments;
  const depositId = rdDetail?.id ?? rd.id;
  const customerName = rd.customer?.displayName ?? rdDetail?.customerDisplayName ?? 'Customer';
  const isActive = rd.status === 'ACTIVE';

  return (
    <>
      <PageHeader
        title={`Recurring Deposit — ${rd.depositNumber ?? id}`}
        subtitle={`${customerName} · ${rd.frequency.charAt(0) + rd.frequency.slice(1).toLowerCase().replace('_', '-')}`}
        backTo="/accounts/recurring-deposits"
        actions={isActive ? <button onClick={() => setShowPay(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"><DollarSign className="w-4 h-4" /> Pay Installment</button> : undefined}
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card"><div className="flex items-center gap-1.5 stat-label"><DollarSign className="w-3.5 h-3.5" /> Installment</div><div className="stat-value text-base">{formatMoney(rd.installmentAmount)} / {rd.frequency.toLowerCase().replace('_', '-')}</div></div>
          <div className="stat-card"><div className="stat-label">Progress</div><div className="stat-value text-base">{rd.completedInstallments}/{rd.totalInstallments}</div><PaymentProgressBar paid={rd.completedInstallments} total={rd.totalInstallments} showLabel={false} /><div className="text-xs text-muted-foreground mt-1">{pct}%</div></div>
          <div className="stat-card"><div className="stat-label">Total Deposited</div><div className="stat-value text-base text-green-600 font-mono">{formatMoney(totalPaid)}</div><div className="text-xs text-muted-foreground">of {formatMoney(totalExpected)}</div></div>
          <div className="stat-card"><div className="flex items-center gap-1.5 stat-label"><Calendar className="w-3.5 h-3.5" /> Next Due</div><div className={cn('stat-value text-base', rd.missedInstallments > 0 && 'text-red-600')}>{rd.status === 'MATURED' || rd.status === 'CLOSED' ? '—' : formatDate(rd.nextDueDate)}</div><StatusBadge status={rd.status} dot /></div>
        </div>

        <PenaltyAlertBanner overdueCount={overdueCount} penaltyAmount={rd.totalPenalties} installmentAmount={rd.installmentAmount} onPayOverdue={() => setShowPay(true)} />

        <TabsPage syncWithUrl tabs={[
          { id: 'schedule', label: 'Schedule', content: <div className="p-4"><InstallmentScheduleTable installments={schedule} onPayInstallment={() => setShowPay(true)} /></div> },
          { id: 'projection', label: 'Projection', content: <div className="p-4"><DepositProjectionChart installments={schedule} installmentAmount={rd.installmentAmount} /></div> },
          { id: 'details', label: 'Plan Details', content: (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="text-sm font-semibold">Payment Summary</h3>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Deposited</span><span className="font-semibold text-green-600 tabular-nums">{formatMoney(totalPaid)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Expected</span><span className="font-medium tabular-nums">{formatMoney(totalExpected)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Remaining</span><span className="font-medium tabular-nums">{formatMoney(Math.max(totalExpected - totalPaid, 0))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current Value</span><span className="font-semibold tabular-nums">{formatMoney(rd.currentValue)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Accrued Interest</span><span className="font-medium text-green-600 tabular-nums">{formatMoney(rd.accruedInterest)}</span></div>
                {rd.totalPenalties > 0 && <div className="flex justify-between text-sm"><span className="text-red-600">Penalties</span><span className="text-red-600 tabular-nums">{formatMoney(rd.totalPenalties)}</span></div>}
              </div>
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="text-sm font-semibold">Plan Info</h3>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Start Date</span><span>{formatDate(rd.startDate)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maturity Date</span><span>{formatDate(rd.maturityDate)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Interest Rate</span><span>{rd.interestRate}% p.a.</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Maturity Action</span><span className="capitalize">{rd.maturityAction.toLowerCase().replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Auto-Debit</span><span>{rd.autoDebit ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Customer</span><span>{customerName}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Account</span><span className="font-mono text-xs">{rd.account?.accountNumber ?? rdDetail?.accountNumber ?? '—'}</span></div>
              </div>
            </div>
          )},
        ]} />
      </div>
      {showPay && <PayInstallmentDialog depositId={depositId} installments={schedule} onClose={() => setShowPay(false)} />}
    </>
  );
}
