import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { loanApi } from '../api/loanApi';

export function LoanDetailPage() {
  const { id } = useParams();
  const loanId = Number(id);

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loans', 'detail', loanId],
    queryFn: () => loanApi.getLoan(loanId),
    enabled: !!loanId && !isNaN(loanId),
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ['loans', loanId, 'schedule'],
    queryFn: () => loanApi.getSchedule(loanId),
    enabled: !!loanId && !isNaN(loanId),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['loans', loanId, 'payments'],
    queryFn: () => loanApi.getPayments(loanId),
    enabled: !!loanId && !isNaN(loanId),
  });

  if (isLoading || !loan) {
    return <><PageHeader title="Loan Detail" /><div className="page-container flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></>;
  }

  return (
    <>
      <PageHeader title={`Loan ${loan.loanNumber}`} subtitle={`${loan.productName} — ${loan.customerName}`} backTo="/lending"
        actions={<div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Record Payment</button>
          <button className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Restructure</button>
        </div>}
      />
      <div className="page-container">
        <div className="rounded-xl border bg-card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={loan.status} size="md" dot />
            <StatusBadge status={loan.classification} size="md" />
            {(loan.daysPastDue || 0) > 0 && <span className="text-sm font-mono text-red-600">{loan.daysPastDue} DPD</span>}
          </div>
          <InfoGrid columns={4} items={[
            { label: 'Disbursed', value: loan.disbursedAmount, format: 'money' },
            { label: 'Outstanding', value: loan.totalOutstanding || loan.outstandingPrincipal, format: 'money' },
            { label: 'Rate', value: `${loan.interestRate}% p.a.`, mono: true },
            { label: 'Remaining', value: `${loan.remainingMonths ?? '—'} of ${loan.tenorMonths} months` },
            { label: 'Next Payment', value: loan.nextPaymentDate ? `${formatMoney(loan.monthlyPayment || 0)} on ${formatDate(loan.nextPaymentDate)}` : '—' },
            { label: 'Disbursed Date', value: loan.disbursedDate || '—', format: loan.disbursedDate ? 'date' : undefined },
            { label: 'Maturity Date', value: loan.maturityDate || '—', format: loan.maturityDate ? 'date' : undefined },
            { label: 'Currency', value: loan.currency || 'NGN' },
          ]} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'schedule', label: 'Schedule', content: (
            <div className="p-4">
              {schedule.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No schedule data</p> : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full data-table">
                    <thead><tr className="bg-muted/30 border-b">
                      <th className="px-4 py-2.5 text-left">#</th><th className="px-4 py-2.5 text-left">Due Date</th><th className="px-4 py-2.5 text-right">Principal</th><th className="px-4 py-2.5 text-right">Interest</th><th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-center">Status</th><th className="px-4 py-2.5 text-right">Outstanding</th>
                    </tr></thead>
                    <tbody>{schedule.map((item) => (
                      <tr key={item.installmentNumber} className={cn(item.status === 'OVERDUE' && 'bg-red-50 dark:bg-red-950/10', item.status === 'DUE' && 'bg-amber-50 dark:bg-amber-950/10')}>
                        <td className="px-4 text-sm">{item.installmentNumber}</td><td className="px-4 text-sm">{formatDate(item.dueDate)}</td><td className="px-4 text-sm font-mono text-right">{formatMoney(item.principalDue)}</td><td className="px-4 text-sm font-mono text-right">{formatMoney(item.interestDue)}</td><td className="px-4 text-sm font-mono text-right font-medium">{formatMoney(item.totalDue)}</td><td className="px-4 text-center"><StatusBadge status={item.status} /></td><td className="px-4 text-sm font-mono text-right">{formatMoney(Math.max(0, item.outstanding))}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )},
          { id: 'payments', label: 'Payments', content: (
            <div className="p-6">
              {payments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No payments recorded</p> : (
                <AuditTimeline events={payments.map((p) => ({ id: String(p.id), action: `Payment — ${formatMoney(p.amount)}`, performedBy: p.source || 'Customer', performedAt: p.paidDate, details: p.type || '' }))} />
              )}
            </div>
          )},
          { id: 'collateral', label: 'Collateral', content: <div className="p-6 text-center text-muted-foreground text-sm">Collateral details loaded from collateral API</div> },
        ]} />
      </div>
    </>
  );
}
