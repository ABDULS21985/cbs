import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TabsPage } from '@/components/shared';
import { useCustomer } from '../hooks/useCustomers';
import { CustomerHeader } from '../components/CustomerHeader';
import { CustomerOverviewTab } from '../components/CustomerOverviewTab';
import { CustomerAccountsTab } from '../components/CustomerAccountsTab';
import { CustomerLoansTab } from '../components/CustomerLoansTab';
import { CustomerCardsTab } from '../components/CustomerCardsTab';
import { CustomerCasesTab } from '../components/CustomerCasesTab';
import { CustomerDocumentsTab } from '../components/CustomerDocumentsTab';
import { CustomerTransactionsTab } from '../components/CustomerTransactionsTab';
import { CustomerCommunicationsTab } from '../components/CustomerCommunicationsTab';
import { CustomerAuditTab } from '../components/CustomerAuditTab';

export default function Customer360Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);

  const { data: customer, isLoading, error } = useCustomer(customerId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        Customer not found or failed to load.
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', content: <CustomerOverviewTab customer={customer} /> },
    { id: 'accounts', label: 'Accounts', content: <CustomerAccountsTab customerId={customerId} /> },
    { id: 'loans', label: 'Loans', content: <CustomerLoansTab customerId={customerId} active /> },
    { id: 'cards', label: 'Cards', content: <CustomerCardsTab customerId={customerId} /> },
    { id: 'cases', label: 'Cases', content: <CustomerCasesTab customerId={customerId} active /> },
    { id: 'documents', label: 'Documents', content: <CustomerDocumentsTab customerId={customerId} active /> },
    { id: 'transactions', label: 'Transactions', content: <CustomerTransactionsTab customerId={customerId} active /> },
    { id: 'communications', label: 'Communications', content: <CustomerCommunicationsTab customerId={customerId} active /> },
    { id: 'audit', label: 'Audit Trail', content: <CustomerAuditTab customerId={customerId} active /> },
  ];

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      <CustomerHeader customer={customer} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <TabsPage tabs={tabs} syncWithUrl />
      </div>
    </div>
  );
}
