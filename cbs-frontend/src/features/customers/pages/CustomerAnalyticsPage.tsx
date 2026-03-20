import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { useCustomer } from '../hooks/useCustomers';
import { useCustomerProfitability, useChurnRisk } from '../hooks/useCustomerAnalytics';
import { ProfitabilityDashboard } from '../components/analytics/ProfitabilityDashboard';
import { ChurnRiskWidget } from '../components/analytics/ChurnRiskWidget';

export function CustomerAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);

  const { data: customer, isLoading: custLoading } = useCustomer(customerId);
  const { data: profitability, isLoading: profLoading, isError: profError } = useCustomerProfitability(customerId);
  const { data: churnRisk, isLoading: churnLoading } = useChurnRisk(customerId);

  useEffect(() => {
    document.title = customer ? `Analytics — ${customer.fullName} | CBS` : 'Customer Analytics | CBS';
  }, [customer]);

  if (custLoading) {
    return (
      <div className="page-container flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading analytics…
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-container text-center py-16">
        <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-medium">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="mt-3 text-sm text-primary hover:underline">Back to Customers</button>
      </div>
    );
  }

  const tabs = [
    {
      id: 'profitability',
      label: 'Profitability',
      content: (
        <div className="p-4">
          {profLoading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Calculating profitability…
            </div>
          ) : profError || !profitability ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Profitability data unavailable</p>
            </div>
          ) : (
            <ProfitabilityDashboard data={profitability} />
          )}
        </div>
      ),
    },
    {
      id: 'churn',
      label: 'Churn Risk',
      content: (
        <div className="p-4">
          {churnLoading ? (
            <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Analyzing churn risk…
            </div>
          ) : !churnRisk ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Churn risk data unavailable</p>
            </div>
          ) : (
            <ChurnRiskWidget data={churnRisk} customerId={customerId} />
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Analytics — ${customer.fullName}`}
        subtitle={`${customer.customerNumber} · Profitability, churn prediction, lifetime value`}
        backTo={`/customers/${id}`}
      />
      <div className="page-container">
        <div className="card overflow-hidden">
          <TabsPage tabs={tabs} syncWithUrl />
        </div>
      </div>
    </>
  );
}
