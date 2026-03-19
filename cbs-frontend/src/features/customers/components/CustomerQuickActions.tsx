import { useNavigate } from 'react-router-dom';
import { CreditCard, FileText, Landmark, MessageSquare, Shield } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

interface CustomerQuickActionsProps {
  customerId: number;
}

export function CustomerQuickActions({ customerId }: CustomerQuickActionsProps) {
  const navigate = useNavigate();
  const canCreateAccount = usePermission('accounts', 'create');
  const canCreateLoan = usePermission('lending', 'create');
  const canCreateCard = usePermission('cards', 'create');
  const canCreateCase = usePermission('cases', 'create');

  const actions = [
    {
      label: 'Open Account',
      icon: Landmark,
      show: canCreateAccount,
      onClick: () => navigate(`/accounts/new?customerId=${customerId}`),
    },
    {
      label: 'New Loan',
      icon: FileText,
      show: canCreateLoan,
      onClick: () => navigate(`/loans/applications/new?customerId=${customerId}`),
    },
    {
      label: 'Issue Card',
      icon: CreditCard,
      show: canCreateCard,
      onClick: () => navigate(`/cards/new?customerId=${customerId}`),
    },
    {
      label: 'Create Case',
      icon: Shield,
      show: canCreateCase,
      onClick: () => navigate(`/cases/new?customerId=${customerId}`),
    },
    {
      label: 'Send Message',
      icon: MessageSquare,
      show: true,
      onClick: () => {},
    },
  ].filter(a => a.show);

  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
