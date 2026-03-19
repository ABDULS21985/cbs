import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useLoan, useLoanSchedule, useLoanPayments } from '../hooks/useLoanData';

export function LoanDetailPage() {
  const { id } = useParams();
  const loanId = Number(id);
  const { data: loan, isLoading: loanLoading, isError } = useLoan(loanId);
  const { data: schedule = [], isLoading: scheduleLoading } = useLoanSchedule(loanId);
  const { data: payments = [], isLoading: paymentsLoading } = useLoanPayments(loanId);

  if (loanLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/lending" />
        <div className="page-container">
          <div className="rounded-xl border bg-card p-6 animate-pulse space-y-4">
            <div className="flex gap-3">
              <div className="h-6 w-20 bg-muted rounded" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-5 w-28 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isError || !loan) {
    return (
      <>
        <PageHeader title="Loan Not Found" backTo="/lending" />
        <div className="page-container">
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {isError ? 'Failed to load loan details. Please try again.' : 'The requested loan could not be found.'}
            </p>
          </div>
        </div>
      </>
    );
  }

  const paymentAuditEvents = payments.map((p) => ({
    id: String(p.id),
    action: `Payment ${p.status === 'REVERSED' ? 'Reversed' : 'Received'}`,
    performedBy: p.channel,
    performedAt: p.paymentDate,
    details: `${p.paymentRef} — ${formatMoney(p.amount)} (Principal: ${formatMoney(p.principalPortion)}, Interest: ${formatMoney(p.interestPortion)})`,
  }));

  return (
    <>
      <PageHeader title={`Loan ${loan.loanNumber}`} subtitle={`${loan.productName} — ${loan.customerName}`} backTo="/lending"
        actions={<div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Record Payment</button>
          <button className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Restructure</button>
        </div>}
      />
      <div className="page-container">
        {/* Loan Header Card */}
        <div className="rounded-xl border bg-card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={loan.status} size="md" dot />
            <StatusBadge status={loan.classification} size="md" />
            {loan.daysPastDue > 0 && <span className="text-sm font-mono text-red-600">{loan.daysPastDue} DPD</span>}
          </div>
          <InfoGrid columns={4} items={[
            { label: 'Disbursed', value: loan.disbursedAmount, format: 'money' },
            { label: 'Outstanding', value: loan.totalOutstanding, format: 'money' },
            { label: 'Rate', value: `${loan.interestRate}% p.a.`, mono: true },
            { label: 'Remaining', value: `${loan.remainingMonths} of ${loan.tenorMonths} months` },
            { label: 'Next Payment', value: `${formatMoney(loan.monthlyPayment)} on ${formatDate(loan.nextPaymentDate)}` },
            { label: 'Disbursed Date', value: loan.disbursedDate, format: 'date' },
            { label: 'Maturity Date', value: loan.maturityDate, format: 'date' },
            { label: 'Currency', value: loan.currency },
          ]} />
        </div>

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          { id: 'schedule', label: 'Schedule', content: (
            <div className="p-4">
              {scheduleLoading ? (
                <div className="space-y-2 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded" />
                  ))}
                </div>
              ) : schedule.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No repayment schedule available</div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full data-table">
                    <thead><tr className="bg-muted/30 border-b">
                      <th className="px-4 py-2.5 text-left">#</th>
                      <th className="px-4 py-2.5 text-left">Due Date</th>
                      <th className="px-4 py-2.5 text-right">Principal</th>
                      <th className="px-4 py-2.5 text-right">Interest</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Outstanding</th>
                    </tr></thead>
                    <tbody>
                      {schedule.map((item) => (
                        <tr key={item.installmentNumber} className={cn(item.status === 'OVERDUE' && 'bg-red-50 dark:bg-red-950/10', item.status === 'DUE' && 'bg-amber-50 dark:bg-amber-950/10')}>
                          <td className="px-4 text-sm">{item.installmentNumber}</td>
                          <td className="px-4 text-sm">{formatDate(item.dueDate)}</td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(item.principalDue)}</td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(item.interestDue)}</td>
                          <td className="px-4 text-sm font-mono text-right font-medium">{formatMoney(item.totalDue)}</td>
                          <td className="px-4 text-center"><StatusBadge status={item.status} /></td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(Math.max(0, item.outstanding))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )},
          { id: 'history', label: 'History', content: (
            <div className="p-6"><AuditTimeline events={paymentAuditEvents} isLoading={paymentsLoading} /></div>
          )},
          { id: 'payments', label: 'Payments', content: (
            <div className="p-6">
              {paymentsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payments recorded yet</div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full data-table">
                    <thead><tr className="bg-muted/30 border-b">
                      <th className="px-4 py-2.5 text-left">Ref</th>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-right">Principal</th>
                      <th className="px-4 py-2.5 text-right">Interest</th>
                      <th className="px-4 py-2.5 text-left">Channel</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr></thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 text-sm font-mono">{p.paymentRef}</td>
                          <td className="px-4 text-sm">{formatDate(p.paymentDate)}</td>
                          <td className="px-4 text-sm font-mono text-right font-medium">{formatMoney(p.amount)}</td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(p.principalPortion)}</td>
                          <td className="px-4 text-sm font-mono text-right">{formatMoney(p.interestPortion)}</td>
                          <td className="px-4 text-sm">{p.channel}</td>
                          <td className="px-4 text-center"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )},
          { id: 'collateral', label: 'Collateral', content: <div className="p-6 text-center text-muted-foreground">Collateral details will load from API</div> },
        ]} />
      </div>
    </>
  );
}
