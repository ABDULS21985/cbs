import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, StatCard, DataTable, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Calendar, Shield, Clock, X, DollarSign, AlertTriangle, ExternalLink,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { loanApi } from '../api/loanApi';
import type { RepaymentScheduleItem, LoanAccount } from '../types/loan';
import { useCollateralList } from '../hooks/useCollateral';
import { toast } from 'sonner';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function RecordPaymentDialog({ loan, onClose }: { loan: LoanAccount; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(loan.monthlyPayment || loan.nextPaymentAmount || 0);
  const recordPayment = useMutation({
    mutationFn: () => loanApi.recordPayment(loan.id, amount),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success(`Payment of ${formatMoney(amount)} recorded`); onClose(); },
    onError: () => toast.error('Failed to record payment'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-muted-foreground">Amount</label><input type="number" step="0.01" className="w-full mt-1 input" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /><p className="text-xs text-muted-foreground mt-1">Next due: {formatMoney(loan.nextPaymentAmount)}</p></div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => recordPayment.mutate()} disabled={amount <= 0 || recordPayment.isPending} className="btn-primary">{recordPayment.isPending ? 'Recording...' : 'Record Payment'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab({ schedule }: { schedule: RepaymentScheduleItem[] }) {
  const totalPrincipal = schedule.reduce((s, i) => s + i.principalDue, 0);
  const totalInterest = schedule.reduce((s, i) => s + i.interestDue, 0);
  const paidCount = schedule.filter((i) => i.status === 'PAID').length;
  const currentIdx = schedule.findIndex((i) => i.status === 'DUE' || i.status === 'OVERDUE');
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold tabular-nums">{schedule.length}</p></div>
        <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-bold tabular-nums text-green-600">{paidCount}</p></div>
        <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-lg font-bold tabular-nums">{schedule.length - paidCount}</p></div>
        <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Principal</p><p className="text-sm font-bold tabular-nums">{formatMoney(totalPrincipal)}</p></div>
        <div className="rounded-lg border p-3 text-center"><p className="text-xs text-muted-foreground">Interest</p><p className="text-sm font-bold tabular-nums">{formatMoney(totalInterest)}</p></div>
      </div>
      {schedule.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No schedule data</p> : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full data-table text-sm">
            <thead><tr className="bg-muted/30 border-b"><th className="px-4 py-2.5 text-left">#</th><th className="px-4 py-2.5 text-left">Due Date</th><th className="px-4 py-2.5 text-right">Principal</th><th className="px-4 py-2.5 text-right">Interest</th><th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-center">Status</th><th className="px-4 py-2.5 text-right">Outstanding</th></tr></thead>
            <tbody>{schedule.map((item, idx) => (
              <tr key={item.installmentNumber} className={cn(item.status === 'PAID' && 'bg-green-50/50 dark:bg-green-950/10', item.status === 'OVERDUE' && 'bg-red-50/50 dark:bg-red-950/10', item.status === 'PARTIALLY_PAID' && 'bg-amber-50/50 dark:bg-amber-950/10', idx === currentIdx && 'ring-1 ring-primary/30')}>
                <td className="px-4 py-2">{idx === currentIdx && <span className="text-primary mr-1">→</span>}{item.installmentNumber}</td>
                <td className="px-4 py-2">{formatDate(item.dueDate)}</td>
                <td className="px-4 py-2 font-mono text-right">{formatMoney(item.principalDue)}</td>
                <td className="px-4 py-2 font-mono text-right">{formatMoney(item.interestDue)}</td>
                <td className="px-4 py-2 font-mono text-right font-medium">{formatMoney(item.totalDue)}</td>
                <td className="px-4 py-2 text-center"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-2 font-mono text-right">{formatMoney(Math.max(0, item.outstanding))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaymentsTab({ schedule, loan }: { schedule: RepaymentScheduleItem[]; loan: LoanAccount }) {
  const payments = schedule.filter((s) => s.paidDate && (s.status === 'PAID' || s.status === 'PARTIALLY_PAID'));
  const totalPaid = payments.reduce((s, p) => s + p.totalPaid, 0);
  const totalPrincipalPaid = payments.reduce((s, p) => s + p.principalPaid, 0);
  const totalInterestPaid = payments.reduce((s, p) => s + p.interestPaid, 0);
  const pieData = [{ name: 'Principal', value: totalPrincipalPaid }, { name: 'Interest', value: totalInterestPaid }].filter((d) => d.value > 0);
  const onTime = payments.filter((p) => p.paidDate && new Date(p.paidDate) <= new Date(p.dueDate)).length;
  const columns: ColumnDef<RepaymentScheduleItem, any>[] = [
    { accessorKey: 'installmentNumber', header: '#' },
    { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => <span className="text-sm tabular-nums">{formatDate(row.original.dueDate)}</span> },
    { accessorKey: 'paidDate', header: 'Paid Date', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.paidDate ? formatDate(row.original.paidDate) : '--'}</span> },
    { accessorKey: 'principalPaid', header: 'Principal', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.principalPaid)}</span> },
    { accessorKey: 'interestPaid', header: 'Interest', cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.interestPaid)}</span> },
    { accessorKey: 'totalPaid', header: 'Total', cell: ({ row }) => <span className="tabular-nums font-medium">{formatMoney(row.original.totalPaid)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Paid" value={totalPaid} format="money" compact icon={DollarSign} />
        <StatCard label="Payments" value={payments.length} format="number" icon={Calendar} />
        <StatCard label="On-Time" value={onTime} format="number" icon={Clock} />
        <StatCard label="Late" value={payments.length - onTime} format="number" icon={AlertTriangle} />
      </div>
      {pieData.length > 0 && (
        <div className="surface-card p-4">
          <p className="text-sm font-medium mb-3">Principal vs Interest</p>
          <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>{pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie><Tooltip formatter={(v: number) => [formatMoney(v), '']} contentStyle={{ fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
        </div>
      )}
      <DataTable columns={columns} data={payments} enableGlobalFilter emptyMessage="No payments recorded" />
    </div>
  );
}

function CollateralTab({ loanId, loan }: { loanId: number; loan: LoanAccount }) {
  const { data: allCollateral = [] } = useCollateralList();
  const navigate = useNavigate();
  const linked = (allCollateral as any[]).filter((c) => c.customerId === loan.customerId || c.loanId === loanId);
  const totalAllocated = linked.reduce((s: number, c: any) => s + (c.marketValue || c.estimatedValue || 0), 0);
  const coverageRatio = loan.totalOutstanding > 0 ? (totalAllocated / loan.totalOutstanding) * 100 : 0;
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Coverage</p><span className={cn('text-sm font-bold', coverageRatio >= 100 ? 'text-green-600' : 'text-red-600')}>{coverageRatio.toFixed(1)}%</span></div>
        <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', coverageRatio >= 100 ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${Math.min(coverageRatio, 100)}%` }} /></div>
      </div>
      {linked.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm"><Shield className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No collateral linked</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{linked.map((c: any) => (
          <div key={c.id} className="surface-card p-4 space-y-2">
            <div className="flex items-center justify-between"><span className="font-mono text-xs font-medium">{c.collateralNumber || `COL-${c.id}`}</span><StatusBadge status={c.collateralType || c.type} /></div>
            <p className="text-sm font-medium">{c.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs"><div><span className="text-muted-foreground">Value:</span> <span className="font-bold tabular-nums">{formatMoney(c.marketValue || c.estimatedValue || 0)}</span></div><div><span className="text-muted-foreground">Lien:</span> <StatusBadge status={c.lienStatus || 'ACTIVE'} /></div></div>
            <button onClick={() => navigate(`/lending/collateral/${c.id}`)} className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View</button>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function AuditTab({ loan, schedule }: { loan: LoanAccount; schedule: RepaymentScheduleItem[] }) {
  const events = useMemo(() => {
    const items: { id: string; action: string; performedBy: string; performedAt: string; details?: string }[] = [];
    if (loan.disbursedDate) items.push({ id: '1', action: 'Loan Disbursed', performedBy: 'System', performedAt: loan.disbursedDate, details: `${formatMoney(loan.disbursedAmount)} at ${loan.interestRate}% for ${loan.tenorMonths}m` });
    schedule.filter((s) => s.paidDate).forEach((s, i) => { items.push({ id: `pay-${i}`, action: `Payment #${s.installmentNumber}`, performedBy: 'Customer', performedAt: s.paidDate!, details: `${formatMoney(s.totalPaid)} paid` }); });
    return items.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }, [loan, schedule]);
  return <div className="p-4">{events.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No audit events</p> : <AuditTimeline events={events} />}</div>;
}

export function LoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loanId = Number(id);
  const [showPayment, setShowPayment] = useState(false);

  const { data: loan, isLoading } = useQuery({ queryKey: ['loans', 'detail', loanId], queryFn: () => loanApi.getLoan(loanId), enabled: !!loanId && !isNaN(loanId) });
  const { data: schedule = [] } = useQuery({ queryKey: ['loans', loanId, 'schedule'], queryFn: () => loanApi.getSchedule(loanId), enabled: !!loanId && !isNaN(loanId) });

  if (isLoading || !loan) {
    return (<><PageHeader title="Loan Detail" backTo="/lending/active" /><div className="page-container space-y-4"><div className="h-32 rounded-xl bg-muted animate-pulse" /><div className="h-64 rounded-xl bg-muted animate-pulse" /></div></>);
  }

  const overdueCount = schedule.filter((s) => s.status === 'OVERDUE').length;

  return (
    <>
      <PageHeader title={`Loan ${loan.loanNumber}`} subtitle={`${loan.productName} — ${loan.customerName}`} backTo="/lending/active" actions={
        <div className="flex gap-2">
          <button onClick={() => setShowPayment(true)} className="btn-primary">Record Payment</button>
          <button onClick={() => navigate(`/lending/${loanId}/restructure`)} className="btn-secondary">Restructure</button>
          <Link to={`/customers/${loan.customerId}`} className="btn-secondary">View Customer</Link>
        </div>
      } />
      <div className="page-container space-y-4">
        <div className="surface-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={loan.status} size="md" dot />
            <StatusBadge status={loan.classification} size="md" />
            {loan.daysPastDue > 0 && <span className="text-sm font-mono text-red-600">{loan.daysPastDue} DPD</span>}
            <div className="ml-auto"><Link to={`/customers/${loan.customerId}`} className="text-xs text-primary hover:underline font-medium">View Customer</Link></div>
          </div>
          <InfoGrid columns={4} items={[
            { label: 'Disbursed', value: loan.disbursedAmount, format: 'money' },
            { label: 'Outstanding', value: loan.totalOutstanding, format: 'money' },
            { label: 'Rate', value: `${loan.interestRate}% p.a.`, mono: true },
            { label: 'Remaining', value: `${loan.remainingMonths ?? '—'} of ${loan.tenorMonths} months` },
            { label: 'Next Payment', value: loan.nextPaymentDate ? `${formatMoney(loan.monthlyPayment)} on ${formatDate(loan.nextPaymentDate)}` : '—' },
            { label: 'Disbursed Date', value: loan.disbursedDate || '—', format: loan.disbursedDate ? 'date' : undefined },
            { label: 'Maturity Date', value: loan.maturityDate || '—', format: loan.maturityDate ? 'date' : undefined },
            { label: 'Currency', value: loan.currency || 'NGN' },
          ]} />
        </div>
        <TabsPage syncWithUrl tabs={[
          { id: 'schedule', label: 'Schedule', badge: overdueCount > 0 ? overdueCount : undefined, content: <ScheduleTab schedule={schedule} /> },
          { id: 'payments', label: 'Payments', content: <PaymentsTab schedule={schedule} loan={loan} /> },
          { id: 'collateral', label: 'Collateral', content: <CollateralTab loanId={loanId} loan={loan} /> },
          { id: 'audit', label: 'Audit', content: <AuditTab loan={loan} schedule={schedule} /> },
        ]} />
      </div>
      {showPayment && <RecordPaymentDialog loan={loan} onClose={() => setShowPayment(false)} />}
    </>
  );
}
