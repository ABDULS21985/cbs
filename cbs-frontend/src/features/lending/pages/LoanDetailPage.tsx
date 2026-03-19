import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, TabsPage, MoneyDisplay, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Mock data
const mockLoan = {
  loanNumber: 'LN-000456', productName: 'SME Working Capital', customerName: 'Chidi Okafor',
  disbursedAmount: 5000000, outstandingPrincipal: 3200000, outstandingInterest: 156789,
  totalOutstanding: 3356789, interestRate: 18, tenorMonths: 12, remainingMonths: 8,
  monthlyPayment: 133333, nextPaymentDate: '2026-04-18', daysPastDue: 0,
  classification: 'CURRENT', status: 'ACTIVE', currency: 'NGN',
  disbursedDate: '2026-01-18', maturityDate: '2027-01-18',
};

const mockSchedule = Array.from({ length: 12 }, (_, i) => ({
  installmentNumber: i + 1,
  dueDate: new Date(2026, i, 18).toISOString(),
  principalDue: 416667, interestDue: 50000 - i * 4167, totalDue: 466667 - i * 4167,
  status: i < 3 ? 'PAID' : i === 3 ? 'DUE' : 'FUTURE',
  outstanding: 5000000 - (i + 1) * 416667,
}));

const mockAudit = [
  { id: '1', action: 'Loan Disbursed', performedBy: 'System', performedAt: '2026-01-18T10:00:00Z', details: '₦5,000,000 disbursed to account 0123456789' },
  { id: '2', action: 'Payment Received', performedBy: 'Customer', performedAt: '2026-02-18T14:30:00Z', details: 'Installment #1 — ₦466,667' },
  { id: '3', action: 'Payment Received', performedBy: 'Customer', performedAt: '2026-03-18T09:15:00Z', details: 'Installment #2 — ₦462,500' },
];

export function LoanDetailPage() {
  const { id } = useParams();

  return (
    <>
      <PageHeader title={`Loan ${mockLoan.loanNumber}`} subtitle={`${mockLoan.productName} — ${mockLoan.customerName}`} backTo="/lending"
        actions={<div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Record Payment</button>
          <button className="px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted">Restructure</button>
        </div>}
      />
      <div className="page-container">
        {/* Loan Header Card */}
        <div className="rounded-xl border bg-card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={mockLoan.status} size="md" dot />
            <StatusBadge status={mockLoan.classification} size="md" />
            {mockLoan.daysPastDue > 0 && <span className="text-sm font-mono text-red-600">{mockLoan.daysPastDue} DPD</span>}
          </div>
          <InfoGrid columns={4} items={[
            { label: 'Disbursed', value: mockLoan.disbursedAmount, format: 'money' },
            { label: 'Outstanding', value: mockLoan.totalOutstanding, format: 'money' },
            { label: 'Rate', value: `${mockLoan.interestRate}% p.a.`, mono: true },
            { label: 'Remaining', value: `${mockLoan.remainingMonths} of ${mockLoan.tenorMonths} months` },
            { label: 'Next Payment', value: `${formatMoney(mockLoan.monthlyPayment)} on ${formatDate(mockLoan.nextPaymentDate)}` },
            { label: 'Disbursed Date', value: mockLoan.disbursedDate, format: 'date' },
            { label: 'Maturity Date', value: mockLoan.maturityDate, format: 'date' },
            { label: 'Currency', value: mockLoan.currency },
          ]} />
        </div>

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          { id: 'schedule', label: 'Schedule', content: (
            <div className="p-4">
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
                    {mockSchedule.map((item) => (
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
            </div>
          )},
          { id: 'history', label: 'History', content: (
            <div className="p-6"><AuditTimeline events={mockAudit} /></div>
          )},
          { id: 'payments', label: 'Payments', content: <div className="p-6 text-center text-muted-foreground">Payment history will load from API</div> },
          { id: 'collateral', label: 'Collateral', content: <div className="p-6 text-center text-muted-foreground">Collateral details will load from API</div> },
        ]} />
      </div>
    </>
  );
}
