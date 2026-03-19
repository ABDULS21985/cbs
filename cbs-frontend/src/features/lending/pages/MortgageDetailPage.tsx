import { useParams } from 'react-router-dom';
import { FileText, Shield, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { EmptyState } from '@/components/shared';
import { useMortgage, useMortgageLtvHistory } from '../hooks/useMortgages';
import { PropertyDetailsCard } from '../components/mortgage/PropertyDetailsCard';
import { LtvTrackingChart } from '../components/mortgage/LtvTrackingChart';
import { MortgageCalculator } from '../components/mortgage/MortgageCalculator';
import { DisbursementMilestones } from '../components/mortgage/DisbursementMilestones';

const statusColor = (status: string): string => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'OVERDUE' || s === 'DEFAULT') return 'bg-red-100 text-red-800';
  if (s === 'CLOSED' || s === 'SETTLED') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
};

export default function MortgageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const loanId = Number(id);

  const { data: loan, isLoading } = useMortgage(loanId);
  const { data: ltvHistory } = useMortgageLtvHistory(loanId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!loan) {
    return <EmptyState title="Mortgage loan not found" description="The requested mortgage loan could not be found." />;
  }

  const tabs = [
    {
      id: 'payment-history',
      label: 'Payment History',
      icon: CreditCard,
      content: (
        <div className="p-6">
          <EmptyState title="Payment history" description="Payment schedule and history will appear here." />
        </div>
      ),
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      content: (
        <div className="p-6">
          <EmptyState title="Documents" description="Mortgage documents, title deeds, and agreements will appear here." />
        </div>
      ),
    },
    {
      id: 'insurance',
      label: 'Insurance',
      icon: Shield,
      content: (
        <div className="p-6">
          <EmptyState title="Insurance" description="Property and life insurance policies will appear here." />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={loan.loanNumber}
        subtitle={`${loan.customerName} — Mortgage Loan`}
        backTo="/lending/mortgages"
        actions={
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor(loan.status)}`}>
            {loan.status}
          </span>
        }
      />

      {/* Main content: two columns */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <PropertyDetailsCard loan={loan} />
          <MortgageCalculator />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <LtvTrackingChart data={ltvHistory} />
          {loan.disbursementType === 'MILESTONE' && (
            <DisbursementMilestones
              milestones={loan.disbursementMilestones}
              currency={loan.currency}
            />
          )}
        </div>
      </div>

      {/* Tabs section */}
      <div className="border rounded-lg mx-6 overflow-hidden bg-card">
        <TabsPage tabs={tabs} syncWithUrl />
      </div>
    </div>
  );
}
